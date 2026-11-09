import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { RefreshCw, ArrowUpRight, Lock, Unlock, CalendarDays, BadgeCheck, CircleDollarSign } from "lucide-react";
import { AppShell, useRequireUser } from "@/components/AppShell";
import { PayDialog, type PayTarget } from "@/components/finance/PayDialog";
import { AttachmentButton } from "@/components/finance/AttachmentButton";
import { Button } from "@/components/ui/button";
import { formatBRL, formatDateBR } from "@/lib/finance/money";
import { getMonthExpenses, getContracts, getAnnualDebtTotals, addManualBill, getCardLimitOverrides, saveCardLimitOverride, clearCardLimitOverride } from "@/lib/finance/finance.functions";
import { getFinances } from "@/lib/pluggy.functions";
import { getFinanceAccountProfiles } from "@/lib/finance/card-profile.functions";
import { MicroBar, MicroRing } from "@/components/finance/MicroChart";
import { getRevenue, createRevenue } from "@/lib/finance/revenue.functions";
import { ReceiveDialog } from "@/components/finance/RevenueForms";
import type { RevenueEntry } from "@/lib/finance/revenue";

export const Route = createFileRoute("/home-broker")({
  ssr: false,
  component: HomeBroker,
  head: () => ({ meta: [{ title: "Painel Financeiro — Axion" }] }),
});

const MONTHS = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

function Kpi({ label, value, emphasis, bar, ring }: { label: string; value: string; emphasis?: boolean; bar?: number | undefined; ring?: number | undefined }) {
  return <div className={`axion-kpi rounded-2xl border p-3 ${emphasis ? "axion-kpi-featured bg-primary text-primary-foreground" : "bg-card"}`}>
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="axion-kpi-label">{label}</p>
        <p className="mt-2 text-lg font-extrabold tracking-tight xl:text-xl">{value}</p>
      </div>
      {ring != null && <MicroRing value={ring} />}
    </div>
    {bar != null && <MicroBar value={bar} tone={emphasis ? "light" : "gold"} />}
  </div>;
}

function HomeBroker() {
  const user = useRequireUser();
  const client = useQueryClient();
  const now = new Date();
  const currentExercise = Number(new Intl.DateTimeFormat("en-US", { timeZone: "America/Sao_Paulo", year: "numeric" }).format(now));
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [target, setTarget] = useState<PayTarget | null>(null);
  const [receiving, setReceiving] = useState<RevenueEntry | null>(null);
  const [registerType, setRegisterType] = useState<"despesas" | "receitas">("despesas");
  const [oneOffOpen, setOneOffOpen] = useState(false);
  const [oneOffName, setOneOffName] = useState("");
  const [oneOffAmount, setOneOffAmount] = useState("");
  const [oneOffDue, setOneOffDue] = useState(new Date().toISOString().slice(0, 10));
  const [oneOffSaving, setOneOffSaving] = useState(false);
  const period = `${year}-${String(month).padStart(2, "0")}`;
  const monthFn = useServerFn(getMonthExpenses);
  const walletFn = useServerFn(getFinances);
  const contractsFn = useServerFn(getContracts);
  const annualDebtFn = useServerFn(getAnnualDebtTotals);
  const overrideFn = useServerFn(getCardLimitOverrides);
  const saveOverrideFn = useServerFn(saveCardLimitOverride);
  const clearOverrideFn = useServerFn(clearCardLimitOverride);
  const [cardsUnlocked, setCardsUnlocked] = useState(false);
  const [cardDrafts, setCardDrafts] = useState<Record<string, { limit: string; used: string }>>({});
  const [savingCard, setSavingCard] = useState<string | null>(null);
  const overrides = useQuery({ queryKey: ["card-limit-overrides", user?.email], queryFn: () => overrideFn(), enabled: !!user });
  const effective = (card: { id: string; creditLimit: number; available: number }) => {
    const manual = overrides.data?.find(item => item.account_id === card.id);
    return { limit: manual?.limit_cents ?? Math.round(card.creditLimit * 100), used: manual?.used_cents ?? Math.round(Math.max(0, card.creditLimit - card.available) * 100), manual: !!manual };
  };
  const unlockCards = () => {
    if (cardsUnlocked) { setCardsUnlocked(false); setCardDrafts({}); return; }
    setCardDrafts(Object.fromEntries(cards.map(card => {
      const value = effective(card);
      return [card.id, { limit: (value.limit / 100).toFixed(2), used: (value.used / 100).toFixed(2) }];
    })));
    setCardsUnlocked(true);
  };
  const saveCard = async (id: string) => {
    const value = cardDrafts[id];
    if (!value) return;
    const limit = Number(value.limit.replace(",", "."));
    const used = Number(value.used.replace(",", "."));
    if (!Number.isFinite(limit) || !Number.isFinite(used) || limit < 0 || used < 0 || used > limit) {
      toast.error("Informe valores válidos; utilizado não pode exceder o limite."); return;
    }
    setSavingCard(id);
    try {
      await saveOverrideFn({ data: { accountId: id, limitCents: Math.round(limit * 100), usedCents: Math.round(used * 100) } });
      await client.invalidateQueries({ queryKey: ["card-limit-overrides"] });
      toast.success("Ajuste manual salvo sem modificar os valores do Open Finance.");
    } catch (e) { toast.error(e instanceof Error ? e.message : "Falha ao salvar."); }
    finally { setSavingCard(null); }
  };
  const restoreCard = async (id: string) => {
    setSavingCard(id);
    try {
      await clearOverrideFn({ data: { accountId: id } });
      await client.invalidateQueries({ queryKey: ["card-limit-overrides"] });
      const card = cards.find(item => item.id === id);
      if (card) setCardDrafts(prev => ({ ...prev, [id]: { limit: card.creditLimit.toFixed(2), used: Math.max(0, card.creditLimit - card.available).toFixed(2) } }));
      toast.success("Valores de Open Finance restaurados.");
    } catch (e) { toast.error(e instanceof Error ? e.message : "Falha ao restaurar."); }
    finally { setSavingCard(null); }
  };
  const revenueFn = useServerFn(getRevenue);
  const createManualBillFn = useServerFn(addManualBill);
  const createRevenueFn = useServerFn(createRevenue);
  const createOneOff = async () => {
    const amount = Number(oneOffAmount.replace(",", "."));
    if (!oneOffName.trim() || !Number.isFinite(amount) || amount <= 0 || !/^\d{4}-\d{2}-\d{2}$/.test(oneOffDue)) {
      toast.error("Informe nome, valor positivo e data válida."); return;
    }
    setOneOffSaving(true);
    try {
      const cents = Math.round(amount * 100);
      if (registerType === "despesas") {
        await createManualBillFn({ data: { creditor: oneOffName.trim(), description: "Conta avulsa", dueDate: oneOffDue, expectedCents: cents } });
      } else {
        await createRevenueFn({ data: {
          title: oneOffName.trim(), category: "Outros Rendimentos", expected_cents: cents,
          first_due: oneOffDue, recurring: false, details: { axion_one_off: "true" },
        } });
      }
      setOneOffOpen(false); setOneOffName(""); setOneOffAmount("");
      refresh();
      toast.success("Conta avulsa criada. Confirme o pagamento ou recebimento na lista; depois ficará no histórico.");
    } catch (e) { toast.error(e instanceof Error ? e.message : "Não foi possível cadastrar a conta."); }
    finally { setOneOffSaving(false); }
  };
  const expenses = useQuery({ queryKey: ["month-expenses", period], queryFn: () => monthFn({ data: { period } }), enabled: !!user });
  const revenue = useQuery({ queryKey: ["revenue", user?.email, period], queryFn: () => revenueFn({ data: { month: period } }), enabled: !!user });
  const incomes = (revenue.data?.entries ?? []).filter(entry => entry.due_date.startsWith(period));
  const incomeExpected = incomes.reduce((sum, item) => sum + item.expected_cents, 0);
  const incomeReceived = incomes.reduce((sum, item) => sum + (item.received_cents ?? 0), 0);
  const contracts = useQuery({ queryKey: ["home-broker-contracts"], queryFn: () => contractsFn({ data: { includeArchived: false } }), enabled: !!user });
  const wallet = useQuery({ queryKey: ["finances"], queryFn: () => walletFn(), enabled: !!user });
  const profileFn = useServerFn(getFinanceAccountProfiles);
  const profiles = useQuery({ queryKey: ["finance-profiles"], queryFn: () => profileFn(), enabled: !!user });
  const annualDebt = useQuery({ queryKey: ["annual-debt-totals", user?.email, currentExercise], queryFn: () => annualDebtFn(), enabled: !!user });
  const bills = expenses.data?.bills ?? [];
  const cards = [...new Map((wallet.data?.accounts?.filter(a => a.type === "CREDIT") ?? []).map(card => [card.id, card])).values()];
  const limits = useMemo(() => cards.reduce((acc, card) => {
    const manual = overrides.data?.find(item => item.account_id === card.id);
    return {
      limit: acc.limit + (manual?.limit_cents ?? Math.round(card.creditLimit * 100)),
      used: acc.used + (manual?.used_cents ?? Math.round(Math.max(0, card.creditLimit - card.available) * 100)),
    };
  }, { limit: 0, used: 0 }), [cards, overrides.data]);
  const stats = expenses.data?.kpis ?? { expected: 0, paid: 0, open: 0, count: 0 };
  // DASH 1: somente Despesas Anuais do ano vigente. Não usa filtros do DASH 2.
  const financialReady = !!annualDebt.data && !annualDebt.error;
  const consumptionReady = financialReady && !annualDebt.data?.migrationRequired;
  const debtTotal = annualDebt.data?.expected ?? 0;
  const debtPaid = annualDebt.data?.paid ?? 0;
  const debtOpen = annualDebt.data?.open ?? 0;
  const pct = annualDebt.data?.pct ?? 0;
  const consumption = annualDebt.data?.consumption;
  const consumptionMonth = annualDebt.data?.currentMonth ?? now.getMonth() + 1;
  const paidCount = bills.filter(b => b.expected_cents > 0 && (b.paid_cents ?? 0) >= b.expected_cents).length;
  const incomePaidCount = incomes.filter(entry => entry.expected_cents > 0 && (entry.received_cents ?? 0) >= entry.expected_cents).length;
  const incomePct = incomeExpected > 0 ? Math.min(100, Math.round(incomeReceived / incomeExpected * 100)) : 0;
  const refresh = () => {
    void client.invalidateQueries({ queryKey: ["month-expenses", period] });
    void client.invalidateQueries({ queryKey: ["history"] });
    void client.invalidateQueries({ queryKey: ["annual-year"] });
    void client.invalidateQueries({ queryKey: ["finances"] });
    void client.invalidateQueries({ queryKey: ["card-limit-overrides"] });
    void client.invalidateQueries({ queryKey: ["revenue"] });
    void client.invalidateQueries({ queryKey: ["home-broker-contracts"] });
    void client.invalidateQueries({ queryKey: ["annual-debt-totals"] });
    void client.invalidateQueries({ queryKey: ["finance-profiles"] });
  };
  return <AppShell active="home-broker" user={user}>
    <div className="mx-auto max-w-[1600px] space-y-6 p-4 sm:p-6 lg:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h1 className="text-3xl font-extrabold tracking-tight">Painel Financeiro</h1>
          <p className="text-sm text-muted-foreground">Visão consolidada do Axion, sem importar ou substituir cadastros.</p>
          <p className="mt-1 text-xs text-muted-foreground" data-release="github-sync-20261107-3">Versão GitHub: 2026.11.07.3</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link to="/receitas"><Button variant="outline">Receitas <ArrowUpRight className="size-4" /></Button></Link>
          <Link to="/despesas/anuais"><Button variant="outline">Despesas anuais <ArrowUpRight className="size-4" /></Button></Link>
          <Button variant="outline" onClick={() => { refresh(); void client.invalidateQueries({ queryKey: ["finances"] }); }}><RefreshCw className="size-4" /> Atualizar</Button>
        </div>
      </div>
      <section className="rounded-2xl border bg-card p-4 shadow-soft">
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <CalendarDays className="size-5 text-primary" />
          <h2 className="text-xl font-bold">Resumo Anual</h2>
          <span className="rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">
            Exercício: {annualDebt.data?.year ?? currentExercise} (ano vigente)
          </span>
        </div>
        <div className="grid gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <div className="min-w-0">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <CircleDollarSign className="size-4 text-primary" />
              <h3 className="font-bold">Dívidas do Exercício</h3>
              <span className="text-xs text-muted-foreground">Somente lançamentos das Despesas Anuais</span>
            </div>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              <Kpi label="Total das dívidas" value={financialReady ? formatBRL(debtTotal) : "—"} emphasis bar={financialReady ? 100 - pct : undefined} />
              <Kpi label="Total já pago" value={financialReady ? formatBRL(debtPaid) : "—"} bar={financialReady ? pct : undefined} />
              <Kpi label="Saldo devedor" value={financialReady ? formatBRL(debtOpen) : "—"} bar={financialReady ? 100 - pct : undefined} />
              <Kpi label="% quitado" value={financialReady ? `${pct}%` : "—"} ring={financialReady ? pct : undefined} />
            </div>
          </div>
          <div className="min-w-0">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <BadgeCheck className="size-4 text-primary" />
              <h3 className="font-bold">Apuração de Consumo</h3>
              <span className="text-xs text-muted-foreground">Água, luz, internet, gás e outros</span>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <Kpi label="Consumo apurado" value={consumptionReady ? formatBRL(consumption?.apurado ?? 0) : "—"} />
              <Kpi label="Consumo pago" value={consumptionReady ? formatBRL(consumption?.pago ?? 0) : "—"} />
            </div>
          </div>
        </div>
        {annualDebt.data?.migrationRequired && (
          <p role="alert" className="mt-3 rounded-lg border border-amber-500/40 p-3 text-sm">
            Classificação de consumo indisponível: a migração do banco ainda não foi aplicada.
            Os valores de dívidas são provisórios e os indicadores de consumo não serão mostrados como zero.
            Acesse Despesas Anuais para classificar os credores após a migração.
          </p>
        )}
        {annualDebt.error && (
          <p role="alert" className="mt-3 rounded-lg border border-destructive/30 p-3 text-sm text-destructive">
            Não foi possível consolidar Despesas Anuais: {annualDebt.error.message}. Valores não foram apresentados como zero.
          </p>
        )}
      </section>

      <section className="rounded-2xl border bg-card p-4 shadow-soft">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div><h2 className="text-lg font-bold">Registro de pagamento</h2>
            <p className="text-xs text-muted-foreground">Selecione Despesas ou Receitas. O registro utiliza as regras e históricos do módulo escolhido.</p></div>
          <div className="flex flex-wrap items-center gap-2">
            <label htmlFor="home-register-type" className="text-sm font-semibold">Tipo</label>
            <select id="home-register-type" aria-label="Tipo do registro" className="rounded-md border bg-background p-2 text-sm" value={registerType} onChange={e => setRegisterType(e.target.value as "despesas" | "receitas")}>
              <option value="despesas">Despesas</option>
              <option value="receitas">Receitas</option>
            </select>
            <select aria-label="Mês" className="rounded-md border bg-background p-2 text-sm" value={month} onChange={e => setMonth(Number(e.target.value))}>
              {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
            </select>
            <select aria-label="Ano" className="rounded-md border bg-background p-2 text-sm" value={year} onChange={e => setYear(Number(e.target.value))}>
              {Array.from({ length: 11 }, (_, i) => now.getFullYear() - 5 + i).map(y => <option key={y} value={y}>{y}</option>)}
            </select>
            <Button type="button" variant="outline" onClick={() => setOneOffOpen(true)}>+ Nova conta avulsa</Button>
          </div>
        </div>
        {registerType === "despesas" ? <>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-[repeat(4,minmax(0,1fr))_minmax(0,1.5fr)]">
            <Kpi label="Valor previsto" value={formatBRL(stats.expected)} bar={100} />
            <Kpi label="Valor pago" value={formatBRL(stats.paid)} bar={stats.expected > 0 ? Math.round(stats.paid / stats.expected * 100) : 0} />
            <Kpi label="Em aberto" value={formatBRL(stats.open)} bar={stats.expected > 0 ? Math.round(stats.open / stats.expected * 100) : 0} />
            <div className="rounded-2xl border bg-success-soft/30 p-3">
              <p className="axion-kpi-label">Consumo do mês atual</p>
              <p className="mt-2 text-lg font-extrabold tracking-tight xl:text-xl">
                {consumptionReady ? formatBRL(consumption?.month ?? 0) : "—"}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">{MONTHS[consumptionMonth - 1]} de {currentExercise}</p>
            </div>
            <div className="rounded-2xl border bg-success-soft/20 p-3">
              <p className="text-sm font-bold">Resumo do mês — {MONTHS[month - 1]}/{year}</p>
              <div className="mt-2 grid grid-cols-3 gap-2 text-center">
                <div><p className="text-xs text-muted-foreground">Contas</p><p className="text-lg font-bold">{stats.count}</p></div>
                <div><p className="text-xs text-muted-foreground">Pagas</p><p className="text-lg font-bold text-success">{paidCount}</p></div>
                <div><p className="text-xs text-muted-foreground">Em aberto</p><p className="text-lg font-bold text-destructive">{Math.max(0, stats.count - paidCount)}</p></div>
              </div>
              <p className="mt-2 text-center text-xs text-muted-foreground">{stats.expected ? Math.round((stats.paid / stats.expected) * 100) : 0}% pago em valor</p>
            </div>
          </div>
          {(expenses.data?.reviewFlags ?? []).map(message => <p className="mt-3 rounded-lg border border-amber-400/40 p-3 text-sm" key={message}>{message}</p>)}
          {expenses.error && <p role="alert" className="mt-4 text-destructive">Não foi possível carregar as contas: {expenses.error.message}</p>}
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[850px] text-sm">
              <thead className="bg-muted text-left text-xs uppercase text-muted-foreground"><tr>
                <th className="p-3">Credor</th><th className="p-3">Previsto</th><th className="p-3">Vencimento</th>
                <th className="p-3">Pagamento</th><th className="p-3">Valor pago</th><th className="p-3">Diferença</th><th className="p-3">Ação</th>
              </tr></thead>
              <tbody className="divide-y">
                {expenses.isLoading && <tr><td colSpan={7} className="p-6 text-center">Carregando pagamentos…</td></tr>}
                {!expenses.isLoading && !expenses.error && bills.length === 0 && <tr><td colSpan={7} className="p-6 text-center text-muted-foreground">Nenhum lançamento neste mês.</td></tr>}
                {bills.map(b => <tr key={b.id} className={b.paid_date ? "bg-success-soft/40" : undefined}>
                  <td className="p-3 font-semibold">{b.creditor}</td><td className="p-3">{formatBRL(b.expected_cents)}</td>
                  <td className="p-3">{formatDateBR(b.due_date)}</td><td className="p-3">{formatDateBR(b.paid_date)}</td>
                  <td className="p-3">{b.paid_date ? formatBRL(b.paid_cents) : "—"}</td>
                  <td className="p-3">{formatBRL(Math.max(0, b.expected_cents - (b.paid_cents ?? 0)))}</td>
                  <td className="p-3"><div className="flex items-center gap-2">
                    <Button size="sm" variant={b.paid_date ? "outline" : "brand"} onClick={() => setTarget({
                      ...(b.kind === "installment" ? { kind: "installment" as const, contractId: b.contract_id, number: b.installment_number } : { kind: "bill" as const, id: b.id }), creditor: b.creditor, due_date: b.due_date,
                      expected_cents: b.expected_cents, paid_date: b.paid_date, paid_cents: b.paid_cents, note: b.paid_note,
                    })}>{b.paid_date ? "Corrigir" : "Confirmar pagamento"}</Button>
                    <AttachmentButton entityType={b.kind === "installment" ? "installment" : "bill"} entityId={b.kind === "installment" ? `${b.contract_id}:${b.installment_number}` : b.id} />
                  </div></td>
                </tr>)}
              </tbody>
            </table>
          </div>
          <div className="mt-3 flex flex-wrap gap-4 text-sm"><Link to="/despesas/anuais" className="text-primary underline">Despesas anuais</Link><Link to="/historico-pagamentos" className="text-primary underline">Histórico de pagamentos</Link></div>
        </> : <>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-[repeat(3,minmax(0,1fr))_minmax(0,1.5fr)]">
            <Kpi label="Previsto a receber" value={formatBRL(incomeExpected)} bar={100} />
            <Kpi label="Total recebido" value={formatBRL(incomeReceived)} bar={incomePct} />
            <Kpi label="A receber" value={formatBRL(Math.max(0, incomeExpected - incomeReceived))} bar={100 - incomePct} />
            <div className="rounded-2xl border bg-success-soft/20 p-3">
              <p className="text-sm font-bold">Resumo do mês — {MONTHS[month - 1]}/{year}</p>
              <div className="mt-2 grid grid-cols-3 gap-2 text-center">
                <div><p className="text-xs text-muted-foreground">Receitas</p><p className="text-lg font-bold">{incomes.length}</p></div>
                <div><p className="text-xs text-muted-foreground">Recebidas</p><p className="text-lg font-bold text-success">{incomePaidCount}</p></div>
                <div><p className="text-xs text-muted-foreground">Em aberto</p><p className="text-lg font-bold text-destructive">{Math.max(0, incomes.length - incomePaidCount)}</p></div>
              </div>
              <p className="mt-2 text-center text-xs text-muted-foreground">{incomePct}% recebido em valor</p>
            </div>
          </div>
          {revenue.error && <p role="alert" className="mt-4 text-sm text-destructive">Não foi possível consultar as receitas: {revenue.error.message}</p>}
          <div className="mt-4 overflow-x-auto"><table className="w-full min-w-[700px] text-sm">
            <thead className="bg-muted text-left text-xs uppercase text-muted-foreground"><tr>
              <th className="p-3">Fonte pagadora</th><th className="p-3">Previsão</th><th className="p-3">Vencimento</th><th className="p-3">Recebimento</th><th className="p-3">Valor recebido</th><th className="p-3">Ação</th>
            </tr></thead>
            <tbody className="divide-y">
              {revenue.isLoading && <tr><td colSpan={6} className="p-5 text-center">Carregando receitas…</td></tr>}
              {!revenue.isLoading && !revenue.error && incomes.length === 0 && <tr><td colSpan={6} className="p-5 text-center text-muted-foreground">Nenhuma receita nesta competência.</td></tr>}
              {incomes.map(entry => <tr key={entry.id}>
                <td className="p-3 font-semibold">{entry.title}</td><td className="p-3">{formatBRL(entry.expected_cents)}</td>
                <td className="p-3">{formatDateBR(entry.due_date)}</td><td className="p-3">{formatDateBR(entry.received_date)}</td>
                <td className="p-3">{entry.received_date ? formatBRL(entry.received_cents ?? 0) : "—"}</td>
                <td className="p-3"><Button size="sm" variant={entry.received_date ? "outline" : "brand"} onClick={() => setReceiving(entry)}>
                  {entry.received_date ? "Corrigir" : "Confirmar recebimento"}</Button></td>
              </tr>)}
            </tbody></table></div>
          <div className="mt-3 flex flex-wrap gap-4 text-sm"><Link to="/receitas" className="text-primary underline">Receitas</Link><Link to="/historico-receitas" className="text-primary underline">Histórico de receitas</Link></div>
        </>}
      </section>
      <section className="rounded-2xl border bg-card p-4 shadow-soft">
        <div className="mb-3 flex items-center justify-between gap-3"><h2 className="font-bold">Contratos Parcelados</h2>
          <Link to="/despesas/parceladas" className="text-sm font-semibold text-primary underline">Ver contratos de despesas</Link></div>
        {contracts.error && <p role="alert" className="text-sm text-destructive">Não foi possível consultar os contratos.</p>}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px] text-sm">
            <thead className="bg-muted text-left text-xs uppercase text-muted-foreground"><tr>
              <th className="p-3">Dívida</th><th className="p-3">Valor total</th><th className="p-3">Já pago</th>
              <th className="p-3">Saldo atual</th><th className="p-3">% pago</th><th className="p-3">Restantes</th>
            </tr></thead>
            <tbody className="divide-y">
              {contracts.isLoading && <tr><td colSpan={6} className="p-4 text-center">Carregando contratos…</td></tr>}
              {!contracts.isLoading && contracts.data?.length === 0 && <tr><td colSpan={6} className="p-4 text-center text-muted-foreground">Nenhum contrato parcelado cadastrado.</td></tr>}
              {(contracts.data ?? []).map((c: { id: string; name: string; kpis: { total: number; paid: number; remaining: number; count: number; paidCount: number } }) => <tr key={c.id}>
                <td className="p-3 font-semibold">{c.name}</td>
                <td className="p-3">{formatBRL(c.kpis.total)}</td><td className="p-3">{formatBRL(c.kpis.paid)}</td>
                <td className="p-3">{formatBRL(c.kpis.remaining)}</td><td className="p-3">{c.kpis.total ? (100 * c.kpis.paid / c.kpis.total).toFixed(1) : "0,0"}%</td>
                <td className="p-3">{Math.max(0, c.kpis.count - c.kpis.paidCount)}</td>
              </tr>)}
            </tbody>
          </table>
        </div>
      </section>
      <section className="rounded-2xl border bg-card p-4 shadow-soft">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <h2 className="font-bold">Cartões — limite utilizado</h2>
            <button type="button" aria-label={cardsUnlocked ? "Bloquear edição dos cartões" : "Desbloquear edição dos cartões"} title={cardsUnlocked ? "Bloquear edição" : "Liberar edição manual"} aria-pressed={cardsUnlocked} onClick={unlockCards} className="rounded-full border p-2 hover:bg-muted focus-visible:ring-2 focus-visible:ring-primary">
              {cardsUnlocked ? <Unlock className="size-4" /> : <Lock className="size-4" />}
            </button>
          </div>
          <Link to="/painel" className="text-sm font-semibold text-primary underline">Abrir Carteira</Link>
        </div>
        {wallet.error && <p role="alert" className="text-sm text-destructive">Dados dos cartões indisponíveis.</p>}
        {overrides.error && <p role="alert" className="text-sm text-destructive">Ajustes manuais indisponíveis: {overrides.error.message}</p>}
        {cards.length === 0 && !wallet.isLoading && <p className="text-sm text-muted-foreground">Nenhum cartão disponível.</p>}
        {cardsUnlocked && <p className="mb-3 text-xs text-muted-foreground">Edite e salve cada cartão. Os ajustes manuais ficam separados dos valores bancários até você restaurar a origem Open Finance.</p>}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="bg-muted text-left text-xs uppercase text-muted-foreground">
              <tr><th className="p-3">Cartão</th><th className="p-3">Limite</th><th className="p-3">Utilizado</th><th className="p-3">Disponível</th><th className="p-3">% utilizado</th>{cardsUnlocked && <th className="p-3">Ações</th>}</tr>
            </thead>
            <tbody className="divide-y">
              {cards.map(card => {
                const value = effective(card);
                const available = Math.max(0, value.limit - value.used);
                const percentage = value.limit > 0 ? Math.min(100, 100 * value.used / value.limit) : 0;
                const draft = cardDrafts[card.id] ?? { limit: (value.limit / 100).toFixed(2), used: (value.used / 100).toFixed(2) };
                return <tr key={card.id}>
                  <td className="p-3 font-semibold">{profiles.data?.find(p => p.account_id === card.id)?.display_name || card.name}{value.manual && <span className="ml-2 text-xs font-normal text-muted-foreground">Ajuste manual</span>}</td>
                  <td className="p-3">{cardsUnlocked ? <input aria-label={`Limite do cartão ${card.name}`} className="w-28 rounded-md border bg-background p-2" inputMode="decimal" value={draft.limit} onChange={e => setCardDrafts(prev => ({...prev, [card.id]: {...draft, limit: e.target.value}}))} /> : formatBRL(value.limit)}</td>
                  <td className="p-3">{cardsUnlocked ? <input aria-label={`Valor utilizado do cartão ${card.name}`} className="w-28 rounded-md border bg-background p-2" inputMode="decimal" value={draft.used} onChange={e => setCardDrafts(prev => ({...prev, [card.id]: {...draft, used: e.target.value}}))} /> : formatBRL(value.used)}</td>
                  <td className="p-3">{formatBRL(available)}</td>
                  <td className="p-3"><div className="flex items-center gap-2"><div className="h-2 w-20 rounded-full bg-muted"><div className="h-full rounded-full bg-primary" style={{ width: `${percentage}%` }} /></div><span>{percentage.toFixed(1)}%</span></div></td>
                  {cardsUnlocked && <td className="p-3"><div className="flex flex-wrap gap-1"><Button size="sm" disabled={savingCard === card.id || !!overrides.error} onClick={() => void saveCard(card.id)}>Salvar</Button>{value.manual && <Button size="sm" variant="outline" disabled={savingCard === card.id} onClick={() => void restoreCard(card.id)}>Restaurar Open Finance</Button>}</div></td>}
                </tr>;
              })}
            </tbody>
            <tfoot className="bg-muted font-semibold"><tr>
              <td className="p-3">Total</td><td className="p-3">{formatBRL(limits.limit)}</td><td className="p-3">{formatBRL(limits.used)}</td>
              <td className="p-3">{formatBRL(Math.max(0, limits.limit - limits.used))}</td>
              <td className="p-3">{limits.limit ? (100 * limits.used / limits.limit).toFixed(1) : "0,0"}%</td>{cardsUnlocked && <td />}
            </tr></tfoot>
          </table>
        </div>
      </section>
    </div>
    {oneOffOpen && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="presentation" onMouseDown={e => { if (e.target === e.currentTarget && !oneOffSaving) setOneOffOpen(false); }}>
      <form role="dialog" aria-modal="true" aria-label={registerType === "despesas" ? "Nova despesa avulsa" : "Nova receita avulsa"} className="w-full max-w-md space-y-4 rounded-2xl border bg-card p-6 shadow-xl" onSubmit={e => { e.preventDefault(); void createOneOff(); }}>
        <div><h2 className="text-lg font-bold">{registerType === "despesas" ? "Nova despesa avulsa" : "Nova receita avulsa"}</h2><p className="text-xs text-muted-foreground">Sem recorrência e sem inclusão na tabela anual. O histórico será gerado após a confirmação da operação.</p></div>
        <label className="block text-sm font-semibold">Nome / {registerType === "despesas" ? "credor" : "fonte pagadora"}<input required maxLength={100} className="mt-1 w-full rounded-md border bg-background p-2" value={oneOffName} onChange={e => setOneOffName(e.target.value)} /></label>
        <label className="block text-sm font-semibold">Valor (R$)<input required type="text" inputMode="decimal" className="mt-1 w-full rounded-md border bg-background p-2" placeholder="0,00" value={oneOffAmount} onChange={e => setOneOffAmount(e.target.value)} /></label>
        <label className="block text-sm font-semibold">Data de vencimento<input required type="date" className="mt-1 w-full rounded-md border bg-background p-2" value={oneOffDue} onChange={e => setOneOffDue(e.target.value)} /></label>
        <div className="flex justify-end gap-2"><Button type="button" variant="outline" disabled={oneOffSaving} onClick={() => setOneOffOpen(false)}>Cancelar</Button><Button type="submit" disabled={oneOffSaving}>{oneOffSaving ? "Salvando…" : "Cadastrar"}</Button></div>
      </form>
    </div>}
    <PayDialog target={target} onClose={() => setTarget(null)} onSaved={refresh} />
    {receiving && <ReceiveDialog entry={receiving} onClose={() => setReceiving(null)} onSaved={refresh} />}
  </AppShell>;
}
