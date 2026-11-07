import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { RefreshCw, ArrowUpRight } from "lucide-react";
import { AppShell, useRequireUser } from "@/components/AppShell";
import { PayDialog, type PayTarget } from "@/components/finance/PayDialog";
import { AttachmentButton } from "@/components/finance/AttachmentButton";
import { Button } from "@/components/ui/button";
import { formatBRL, formatDateBR } from "@/lib/finance/money";
import { getMonthExpenses, getContracts } from "@/lib/finance/finance.functions";
import { getFinances } from "@/lib/pluggy.functions";
import { getRevenue } from "@/lib/finance/revenue.functions";
import { ReceiveDialog } from "@/components/finance/RevenueForms";
import type { RevenueEntry } from "@/lib/finance/revenue";

export const Route = createFileRoute("/home-broker")({
  ssr: false,
  component: HomeBroker,
  head: () => ({ meta: [{ title: "Home Broker — Conecta" }] }),
});

const MONTHS = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

function Kpi({ label, value, emphasis }: { label: string; value: string; emphasis?: boolean }) {
  return <div className={`rounded-2xl border p-4 ${emphasis ? "bg-primary text-primary-foreground" : "bg-card"}`}>
    <p className="text-xs font-semibold uppercase tracking-wide opacity-70">{label}</p>
    <p className="mt-2 text-xl font-extrabold">{value}</p>
  </div>;
}

function HomeBroker() {
  const user = useRequireUser();
  const client = useQueryClient();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [target, setTarget] = useState<PayTarget | null>(null);
  const [receiving, setReceiving] = useState<RevenueEntry | null>(null);
  const [registerType, setRegisterType] = useState<"despesas" | "receitas">("despesas");
  const period = `${year}-${String(month).padStart(2, "0")}`;
  const monthFn = useServerFn(getMonthExpenses);
  const walletFn = useServerFn(getFinances);
  const contractsFn = useServerFn(getContracts);
  const revenueFn = useServerFn(getRevenue);
  const expenses = useQuery({ queryKey: ["month-expenses", period], queryFn: () => monthFn({ data: { period } }), enabled: !!user });
  const revenue = useQuery({ queryKey: ["revenue", user?.email, period], queryFn: () => revenueFn({ data: { month: period } }), enabled: !!user });
  const incomes = (revenue.data?.entries ?? []).filter(entry => entry.due_date.startsWith(period));
  const incomeExpected = incomes.reduce((sum, item) => sum + item.expected_cents, 0);
  const incomeReceived = incomes.reduce((sum, item) => sum + (item.received_cents ?? 0), 0);
  const contracts = useQuery({ queryKey: ["home-broker-contracts"], queryFn: () => contractsFn({ data: { includeArchived: false } }), enabled: !!user });
  const wallet = useQuery({ queryKey: ["finances"], queryFn: () => walletFn(), enabled: !!user });
  const bills = expenses.data?.bills ?? [];
  const cards = wallet.data?.accounts?.filter(a => a.type === "CREDIT") ?? [];
  const limits = useMemo(() => cards.reduce((acc, card) => ({
    limit: acc.limit + card.creditLimit,
    used: acc.used + Math.max(0, card.creditLimit - card.available),
  }), { limit: 0, used: 0 }), [cards]);
  const stats = expenses.data?.kpis ?? { expected: 0, paid: 0, open: 0, count: 0 };
  const pct = stats.expected > 0 ? Math.min(100, Math.round(stats.paid / stats.expected * 100)) : 0;
  const refresh = () => {
    void client.invalidateQueries({ queryKey: ["month-expenses", period] });
    void client.invalidateQueries({ queryKey: ["history"] });
    void client.invalidateQueries({ queryKey: ["annual-year"] });
    void client.invalidateQueries({ queryKey: ["revenue"] });
    void client.invalidateQueries({ queryKey: ["home-broker-contracts"] });
  };
  return <AppShell active="home-broker" user={user}>
    <div className="space-y-6 p-5 lg:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h1 className="text-3xl font-extrabold">Painel Financeiro</h1>
          <p className="text-sm text-muted-foreground">Visão consolidada do Conecta, sem importar ou substituir cadastros.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link to="/receitas"><Button variant="outline">Receitas <ArrowUpRight className="size-4" /></Button></Link>
          <Link to="/despesas/anuais"><Button variant="outline">Despesas anuais <ArrowUpRight className="size-4" /></Button></Link>
          <Button variant="outline" onClick={() => { refresh(); void client.invalidateQueries({ queryKey: ["finances"] }); }}><RefreshCw className="size-4" /> Atualizar</Button>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi label="Total previsto do mês" value={formatBRL(stats.expected)} emphasis />
        <Kpi label="Total já pago" value={formatBRL(stats.paid)} />
        <Kpi label="Saldo a pagar" value={formatBRL(stats.open)} />
        <Kpi label="% quitado" value={`${pct}%`} />
      </div>
      <section className="rounded-2xl border bg-card p-4 shadow-soft">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div><h2 className="text-lg font-bold">Registro de pagamento</h2>
            <p className="text-xs text-muted-foreground">Selecione Despesas ou Receitas. O registro utiliza as regras e históricos do módulo escolhido.</p></div>
          <div className="flex flex-wrap items-center gap-2">
            <label htmlFor="home-register-type" className="text-sm font-semibold">Tipo</label>
            <select id="home-register-type" aria-label="Tipo do registro" className="rounded-md border bg-background p-2 text-sm" value={registerType} onChange={e => setRegisterType(e.target.value as "despesas" | "receitas")}>
              <option value="despesas">Despesas — pagamentos</option>
              <option value="receitas">Receitas — recebimentos</option>
            </select>
            <select aria-label="Mês" className="rounded-md border bg-background p-2 text-sm" value={month} onChange={e => setMonth(Number(e.target.value))}>
              {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
            </select>
            <select aria-label="Ano" className="rounded-md border bg-background p-2 text-sm" value={year} onChange={e => setYear(Number(e.target.value))}>
              {Array.from({ length: 11 }, (_, i) => now.getFullYear() - 5 + i).map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
        </div>
        {registerType === "despesas" ? <>
          <div className="mt-4 grid gap-3 sm:grid-cols-4">
            <Kpi label="Valor previsto" value={formatBRL(stats.expected)} />
            <Kpi label="Valor pago" value={formatBRL(stats.paid)} />
            <Kpi label="Em aberto" value={formatBRL(stats.open)} />
            <Kpi label="Contas do mês" value={String(stats.count)} />
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
                {!expenses.isLoading && bills.length === 0 && <tr><td colSpan={7} className="p-6 text-center text-muted-foreground">Nenhum lançamento neste mês.</td></tr>}
                {bills.map(b => <tr key={b.id} className={b.paid_date ? "bg-success-soft/40" : undefined}>
                  <td className="p-3 font-semibold">{b.creditor}</td><td className="p-3">{formatBRL(b.expected_cents)}</td>
                  <td className="p-3">{formatDateBR(b.due_date)}</td><td className="p-3">{formatDateBR(b.paid_date)}</td>
                  <td className="p-3">{b.paid_date ? formatBRL(b.paid_cents) : "—"}</td>
                  <td className="p-3">{b.paid_date ? formatBRL((b.paid_cents ?? 0) - b.expected_cents) : "—"}</td>
                  <td className="p-3"><div className="flex items-center gap-2">
                    <Button size="sm" variant={b.paid_date ? "outline" : "brand"} onClick={() => setTarget({
                      kind: "bill", id: b.id, creditor: b.creditor, due_date: b.due_date,
                      expected_cents: b.expected_cents, paid_date: b.paid_date, paid_cents: b.paid_cents, note: b.paid_note,
                    })}>{b.paid_date ? "Corrigir" : "Confirmar pagamento"}</Button>
                    <AttachmentButton entityType="bill" entityId={b.id} />
                  </div></td>
                </tr>)}
              </tbody>
            </table>
          </div>
          <div className="mt-3 flex flex-wrap gap-4 text-sm"><Link to="/despesas/anuais" className="text-primary underline">Despesas anuais</Link><Link to="/historico-pagamentos" className="text-primary underline">Histórico de pagamentos</Link></div>
        </> : <>
          <div className="mt-4 grid gap-3 sm:grid-cols-4">
            <Kpi label="Previsto a receber" value={formatBRL(incomeExpected)} />
            <Kpi label="Total recebido" value={formatBRL(incomeReceived)} />
            <Kpi label="A receber" value={formatBRL(Math.max(0, incomeExpected - incomeReceived))} />
            <Kpi label="Lançamentos" value={String(incomes.length)} />
          </div>
          {revenue.error && <p role="alert" className="mt-4 text-sm text-destructive">Não foi possível consultar as receitas: {revenue.error.message}</p>}
          <div className="mt-4 overflow-x-auto"><table className="w-full min-w-[700px] text-sm">
            <thead className="bg-muted text-left text-xs uppercase text-muted-foreground"><tr>
              <th className="p-3">Fonte pagadora</th><th className="p-3">Previsão</th><th className="p-3">Vencimento</th><th className="p-3">Recebimento</th><th className="p-3">Valor recebido</th><th className="p-3">Ação</th>
            </tr></thead>
            <tbody className="divide-y">
              {revenue.isLoading && <tr><td colSpan={6} className="p-5 text-center">Carregando receitas…</td></tr>}
              {!revenue.isLoading && incomes.length === 0 && <tr><td colSpan={6} className="p-5 text-center text-muted-foreground">Nenhuma receita nesta competência.</td></tr>}
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
              {(contracts.data ?? []).map(c => <tr key={c.id}>
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
        <div className="mb-3 flex items-center justify-between"><h2 className="font-bold">Cartões — limite utilizado</h2>
          <Link to="/painel" className="text-sm font-semibold text-primary underline">Abrir Carteira</Link></div>
        {wallet.error && <p className="text-sm text-destructive">Dados dos cartões indisponíveis.</p>}
        {cards.length === 0 && !wallet.isLoading && <p className="text-sm text-muted-foreground">Nenhum cartão disponível.</p>}
        <div className="space-y-3">
          {cards.map(card => { const used = Math.max(0, card.creditLimit - card.available); const percentage = card.creditLimit ? Math.min(100, used / card.creditLimit * 100) : 0;
            return <div className="grid gap-2 border-t pt-3 sm:grid-cols-4" key={card.id}>
              <strong className="truncate">{card.name}</strong><span>Limite: {formatBRL(Math.round(card.creditLimit * 100))}</span>
              <span>Usado: {formatBRL(Math.round(used * 100))}</span>
              <div className="flex items-center gap-2"><div className="h-2 flex-1 rounded-full bg-muted"><div className="h-full rounded-full bg-primary" style={{width: `${percentage}%`}} /></div><span className="text-xs">{percentage.toFixed(0)}%</span></div>
            </div>; })}
        </div>
        <div className="mt-3 border-t pt-3 text-sm font-semibold">Limite total: {formatBRL(Math.round(limits.limit * 100))} · Utilizado: {formatBRL(Math.round(limits.used * 100))}</div>
      </section>
    </div>
    <PayDialog target={target} onClose={() => setTarget(null)} onSaved={refresh} />
    {receiving && <ReceiveDialog entry={receiving} onClose={() => setReceiving(null)} onSaved={refresh} />}
  </AppShell>;
}
