import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowRight, Archive, ArchiveRestore, Plus, Trash2, Pencil, RefreshCcw } from "lucide-react";
import { toast } from "sonner";
import { AppShell, useRequireUser } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { formatBRL, parseBRL } from "@/lib/finance/money";
import {
  addCreditor, deleteCreditor, getAnnualYear, setYearArchived, updateAnnualCell, updateCreditor,
} from "@/lib/finance/finance.functions";
import { getAnnualContractChoices, projectAnnualContract, projectFixedAnnualConsumption } from "@/lib/finance/annual-projections.functions";
import { scheduleAnnualTax } from "@/lib/finance/annual-tax.functions";
import { annualTaxSchedule } from "@/lib/finance/annual-tax";
import { getFinances } from "@/lib/pluggy.functions";
import { getFinanceAccountProfiles, saveFinanceAccountProfile, syncProviderClosedCardInvoices, previewFutureCardInstallments } from "@/lib/finance/card-profile.functions";

export const Route = createFileRoute("/despesas/anuais")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Despesas Anuais — Axion" },
      { name: "description", content: "Grade anual de despesas por credor e mês." },
      { property: "og:title", content: "Despesas Anuais — Axion" },
      { property: "og:description", content: "Grade anual de despesas por credor e mês." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AnuaisPage,
});

const MONTHS_SHORT = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
type SourceKind = "manual" | "card" | "contract" | "consumption" | "annual_tax";
type AnnualTaxKind = "iptu" | "ipva" | "other";
const TAX_LABELS:Record<AnnualTaxKind,string> = {iptu:"IPTU",ipva:"IPVA",other:"Outro tributo anual"};
type CreditorDraft = {
  id: string; creditor: string; dueDay: string;
  expenseSource: SourceKind; sourceContractId: string; cardAccountId: string;
  consumptionValueType: "fixed" | "variable"; fixedValue: string;
  annualTaxKind: AnnualTaxKind; taxTotal: string; taxFirstMonth: number; taxInstallments: number;
};
type ContractChoice = { id: string; name: string };
type CardChoice = { id: string; name: string };
type CardProfile = { account_id: string; annual_expense_id: string | null; display_name: string | null; card_brand: string | null };
const sourceName = (source: SourceKind, vtype?: string, annualTaxKind?:AnnualTaxKind) =>
  source === "consumption" ? `Consumo ${vtype === "variable" ? "variável" : "fixo"}` :
  source === "annual_tax" ? TAX_LABELS[annualTaxKind ?? "other"] :
  source === "contract" ? "Contrato parcelado" : source === "card" ? "Cartão" : "Despesa avulsa";
const kindFromSource = (source: SourceKind) => source === "consumption" ? "consumption" as const : "debt" as const;


function AnuaisPage() {
  const user = useRequireUser();
  const qc = useQueryClient();
  const [year, setYear] = useState(new Date().getFullYear());
  const [editCell, setEditCell] = useState<{ id: string; month: number; value: string } | null>(null);
  const [editCreditor, setEditCreditor] = useState<CreditorDraft | null>(null);
  const [savingCreditor, setSavingCreditor] = useState(false);
  const [syncingCards, setSyncingCards] = useState(false);
  const [addOpen, setAddOpen] = useState(false);

  const getFn = useServerFn(getAnnualYear);
  const cellFn = useServerFn(updateAnnualCell);
  const updCredFn = useServerFn(updateCreditor);
  const delCredFn = useServerFn(deleteCreditor);
  const archiveFn = useServerFn(setYearArchived);
  const contractsFn = useServerFn(getAnnualContractChoices);
  const walletFn = useServerFn(getFinances);
  const profileFn = useServerFn(getFinanceAccountProfiles);
  const saveProfileFn = useServerFn(saveFinanceAccountProfile);
  const syncCardsFn = useServerFn(syncProviderClosedCardInvoices);
  const previewCardsFn = useServerFn(previewFutureCardInstallments);
  const projectContractFn = useServerFn(projectAnnualContract);
  const projectConsumptionFn = useServerFn(projectFixedAnnualConsumption);
  const scheduleTaxFn = useServerFn(scheduleAnnualTax);
  const contractsQuery = useQuery({queryKey:["annual-contract-choices"],queryFn:()=>contractsFn(),enabled:!!user});
  const walletQuery = useQuery({queryKey:["finances"],queryFn:()=>walletFn(),enabled:!!user});
  const cardProfileQuery = useQuery({queryKey:["finance-profiles"],queryFn:()=>profileFn(),enabled:!!user});
  const cardChoices: CardChoice[] = [...new Map((walletQuery.data?.accounts ?? [])
    .filter(a=>a.type === "CREDIT").map(a=>[a.id,{id:a.id,name:a.name}])).values()];
  const profiles: CardProfile[] = cardProfileQuery.data?.profiles ?? [];
  const cardProfilesAvailable = cardProfileQuery.data?.available === true;


  const futureCardQuery = useQuery({queryKey:["card-installment-forecast",year],queryFn:()=>previewCardsFn({data:{year}}),enabled:!!user && cardProfilesAvailable && year>=new Date().getFullYear(),staleTime:300000});
  const q = useQuery({ queryKey: ["annual", year], queryFn: () => getFn({ data: { year } }), enabled: !!user });
  const savedRows = q.data?.rows ?? [];
  const cardCreditors = savedRows.filter((r: {id:string;creditor:string;expense_source?:string|null}) => r.expense_source === "card");
  const unlinkedCardCreditors = cardProfilesAvailable
    ? cardCreditors.filter((r: {id:string;creditor:string}) => !profiles.some(p => p.annual_expense_id === r.id)) : [];
  const cardForecasts = futureCardQuery.data?.forecasts ?? [];
  // Credores vinculados aparecem na grade anual mesmo sem uma linha persistida neste exercício.
  // A previsão é uma sobreposição de leitura, nunca uma baixa nem uma fatura fechada.
  // Exibir credores vinculados em todos os exercícios futuros, mesmo sem
  // metadados de parcelas. Nunca presumir valores nem associar por nome.
  const linkedFutureCards = futureCardQuery.data?.linkedCards ?? [];
  const virtualCardRows = linkedFutureCards
    .filter(card => !savedRows.some((r: {id:string}) => r.id === card.annualExpenseId))
    .map(card => ({
      id:`forecast:${card.accountId}:${year}`,
      creditor:card.creditor, creditor_original:card.creditor,
      expense_source:"card", expense_kind:"debt", due_day:null,
      forecast_only:true, card_account_id:card.accountId
    }));
  const rows = [...savedRows,...virtualCardRows];
  const archived = !!q.data?.year?.archived_at;
  const stats = q.data?.stats ?? { paidCents: 0, paidExpected: 0 };

  const monthsByRow = new Map<string, Map<number, number | null>>();
  for (const mm of q.data?.months ?? []) {
    if (!monthsByRow.has(mm.annual_expense_id)) monthsByRow.set(mm.annual_expense_id, new Map());
    monthsByRow.get(mm.annual_expense_id)!.set(mm.month, mm.expected_cents);
  }
  for (const f of cardForecasts) {
    const matching = profiles.find(p=>p.account_id===f.accountId);
    const id = savedRows.some((r: {id:string})=>r.id===matching?.annual_expense_id) ? matching!.annual_expense_id! : `forecast:${f.accountId}:${year}`;
    if (!monthsByRow.has(id)) monthsByRow.set(id,new Map());
    const cells = monthsByRow.get(id)!;
    // Valor oficial da competência tem precedência; jamais duplicar uma fatura fechada.
    if ((!cells.has(f.month) || cells.get(f.month)===null || cells.get(f.month)===0) && !(q.data?.paidMonths?.[id] ?? []).includes(f.month)) cells.set(f.month,f.expected_cents);
  }
  const monthTotals = Array.from({ length: 12 }, (_, i) =>
    rows.reduce((s: number, r: any) => s + (monthsByRow.get(r.id)?.get(i + 1) ?? 0), 0));
  const grandTotal = monthTotals.reduce((a, b) => a + b, 0);
  const aPagar = grandTotal - stats.paidExpected;

  function refresh() {
    void qc.invalidateQueries({ queryKey: ["annual", year] });
    void qc.invalidateQueries({ queryKey: ["annual-debt-totals"] });
    void qc.invalidateQueries({ queryKey: ["annual-contract-choices"] });
    void qc.invalidateQueries({ queryKey: ["finance-profiles"] });
    void qc.invalidateQueries({ queryKey: ["card-installment-forecast",year] });
  }

  async function commitCell() {
    if (!editCell) return;
    const trimmed = editCell.value.trim();
    const cents = trimmed === "" ? null : parseBRL(trimmed);
    if (trimmed !== "" && (cents === null || cents < 0)) {
      toast.error("Valor inválido.");
      return;
    }
    try {
      await cellFn({ data: { expenseId: editCell.id, month: editCell.month, expectedCents: cents } });
      setEditCell(null);
      refresh();
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  async function toggleArchive() {
    const action = archived ? "reabrir" : "arquivar";
    if (!window.confirm(`Deseja ${action} o exercício ${year}?`)) return;
    try {
      await archiveFn({ data: { year, archived: !archived } });
      toast.success(archived ? "Exercício reaberto." : "Exercício arquivado (somente leitura).");
      refresh();
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  async function syncCards() {
    if (!cardProfilesAvailable) {
      toast.error("Vínculos de cartão indisponíveis: falta a migração 20261107140000 no banco conectado.");
      return;
    }
    setSyncingCards(true);
    try {
      const result = await syncCardsFn();
      if (result.linkedCards === 0) toast.warning("Nenhum cartão vinculado a Despesas Anuais. Use o lápis de cada credor para selecionar o cartão.");
      else if (result.errors.length) toast.warning(`Sincronização parcial: ${result.updated} atualizadas, ${result.unchanged} sem alteração, ${result.skipped} ignoradas. ${result.errors.length} erro(s): ${result.errors.join("; ").slice(0,350)}`);
      else toast.success(`Faturas: ${result.updated} atualizadas, ${result.unchanged} sem alteração, ${result.skipped} ignoradas.`);
      if (unlinkedCardCreditors.length) toast.warning(`Sem vínculo Open Finance: ${unlinkedCardCreditors.map((r: {creditor:string})=>r.creditor).join(", ")}. Edite cada credor pelo lápis.`);
      refresh();
    } catch(e) {
      toast.error(e instanceof Error ? e.message : "Falha ao sincronizar faturas.");
    } finally { setSyncingCards(false); }
  }

  async function syncCardLink(annualId:string, selectedCardId:string, source:SourceKind) {
    const previous=profiles.find(p=>p.annual_expense_id===annualId);
    if(previous && (source!=="card" || previous.account_id!==selectedCardId)) {
      await saveProfileFn({data:{accountId:previous.account_id,displayName:previous.display_name,
        cardBrand:previous.card_brand as "VISA"|"MASTERCARD"|"ELO"|"AMEX"|"HIPERCARD"|"OTHER"|null,annualExpenseId:null}});
    }
    if(source==="card" && selectedCardId) {
      const profile=profiles.find(p=>p.account_id===selectedCardId);
      if(profile?.annual_expense_id && profile.annual_expense_id!==annualId)
        throw new Error("Este cartão já está vinculado a outro credor anual. Revise o vínculo em Carteiras antes de alterá-lo.");
      await saveProfileFn({data:{accountId:selectedCardId,displayName:profile?.display_name??null,
        cardBrand:(profile?.card_brand as "VISA"|"MASTERCARD"|"ELO"|"AMEX"|"HIPERCARD"|"OTHER"|null)??null,annualExpenseId:annualId}});
    }
  }

  async function saveCreditor() {
    if(!editCreditor || savingCreditor) return;
    const dueDay=editCreditor.dueDay.trim()===""?null:Number(editCreditor.dueDay);
    if(!editCreditor.creditor.trim() || (dueDay!==null && (!Number.isInteger(dueDay) || dueDay<1 || dueDay>31))) {
      toast.error("Informe um credor e vencimento válido.");return;
    }
    if(editCreditor.expenseSource==="contract" && !editCreditor.sourceContractId) {
      toast.error("Selecione o contrato parcelado cadastrado.");return;
    }
    if(editCreditor.expenseSource==="card" && !cardProfilesAvailable) {
      toast.error("Não é possível salvar o vínculo enquanto a tabela finance_account_profiles estiver indisponível.");
      return;
    }
    if(editCreditor.expenseSource==="card" && !editCreditor.cardAccountId) {
      toast.error("Selecione um cartão conectado ao Open Finance.");return;
    }
    if(editCreditor.expenseSource==="annual_tax" && editCreditor.taxTotal.trim()) {
      try {
        annualTaxSchedule({totalCents:parseBRL(editCreditor.taxTotal)??0,
          firstMonth:editCreditor.taxFirstMonth,installments:editCreditor.taxInstallments});
      } catch(e) {toast.error(e instanceof Error?e.message:"Parcelamento inválido.");return;}
    }
    let fixedCents: number | null=null;
    if(editCreditor.expenseSource==="consumption" && editCreditor.consumptionValueType==="fixed" && editCreditor.fixedValue.trim()){
      fixedCents=parseBRL(editCreditor.fixedValue);
      if(fixedCents===null || fixedCents<=0){toast.error("Informe um valor fixo válido.");return;}
    }
    setSavingCreditor(true);
    try {
      await updCredFn({data:{
        expenseId:editCreditor.id,creditor:editCreditor.creditor.trim(),dueDay,
        expenseKind:kindFromSource(editCreditor.expenseSource),
        expenseSource:editCreditor.expenseSource,
        sourceContractId:editCreditor.expenseSource==="contract"?editCreditor.sourceContractId:null,
        consumptionValueType:editCreditor.consumptionValueType,
        annualTaxKind:editCreditor.expenseSource==="annual_tax"?editCreditor.annualTaxKind:null,
      }});
      await syncCardLink(editCreditor.id,editCreditor.cardAccountId,editCreditor.expenseSource);
      if(editCreditor.expenseSource==="card") await syncCards();
      if(editCreditor.expenseSource==="annual_tax" && editCreditor.taxTotal.trim()) {
        const amount=parseBRL(editCreditor.taxTotal);
        if(amount===null || amount<=0)throw new Error("Informe o valor anual válido do tributo.");
        const result=await scheduleTaxFn({data:{expenseId:editCreditor.id,totalCents:amount,
          firstMonth:editCreditor.taxFirstMonth,installments:editCreditor.taxInstallments}});
        toast.success(`Tributo ${result.year}: ${result.created} competências adicionadas; ${result.preserved} preservadas.`);
      }
      if(editCreditor.expenseSource==="contract") {
        const result=await projectContractFn({data:{expenseId:editCreditor.id,contractId:editCreditor.sourceContractId}});
        toast.success(`Contrato vinculado. ${result.created} parcelas mensais geradas até ${result.years.at(-1)}; ${result.preserved} lançamentos preservados.`);
      } else if(editCreditor.expenseSource==="consumption" && editCreditor.consumptionValueType==="fixed" && fixedCents){
        const result=await projectConsumptionFn({data:{expenseId:editCreditor.id,monthlyCents:fixedCents}});
        toast.success(`Consumo fixo projetado até ${result.years.at(-1)}; ${result.preserved} meses preservados.`);
      } else {
        toast.success("Credor atualizado e classificado.");
      }
      if(editCreditor.expenseSource==="consumption" && editCreditor.consumptionValueType==="fixed" && !fixedCents)
        toast.info("Informe a mensalidade para gerar as projeções de consumo fixo.");
      setEditCreditor(null);
      refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não foi possível atualizar o credor.");
      // Mantém o formulário aberto se a classificação salvou mas a projeção falhou;
      // uma nova tentativa é idempotente e preserva valores anteriores.
      refresh();
    } finally {setSavingCreditor(false);}
  }

  async function removeCreditor(id: string, name: string) {
    if (!window.confirm(`Excluir o credor "${name}" do exercício ${year}?`)) return;
    try {
      await delCredFn({ data: { expenseId: id } });
      toast.success("Credor excluído.");
      setEditCreditor(null);
      refresh();
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  return (
    <AppShell active="anuais" user={user}>
      <div className="p-6 lg:p-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Controle financeiro</div>
            <h1 className="text-3xl font-extrabold">Despesas anuais</h1>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link to="/home-broker"><Button variant="outline">Registro de pagamento <ArrowRight /></Button></Link>
            <Link to="/despesas/parceladas"><Button variant="brand">Contratos parcelados <ArrowRight /></Button></Link>
            <Link to="/historico-pagamentos"><Button variant="outline">Histórico de pagamentos</Button></Link>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <span className={`rounded-full px-3 py-1 text-xs font-bold ${archived ? "bg-amber-200 text-amber-900" : "bg-success-soft text-success"}`}>
            {archived ? "Arquivo" : "Em andamento"}
          </span>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">Exercício:</span>
            <select className="h-9 rounded-md border bg-card px-2 text-sm" value={year} onChange={(e) => setYear(Number(e.target.value))}>
              {[...new Set([year, new Date().getFullYear(), ...(q.data?.years ?? []).map((yy: any) => yy.year as number)])].sort((a, b) => b - a).map((yy) => (
                <option key={yy} value={yy}>{yy}</option>
              ))}
            </select>
          </div>
          <Button variant="outline" size="sm" disabled={syncingCards || !cardProfilesAvailable} onClick={()=>void syncCards()}><RefreshCcw className="size-4" /> {syncingCards?"Atualizando...":"Sincronizar faturas"}</Button>
          <Button variant="outline" size="sm" onClick={toggleArchive}>
            {archived ? <><ArchiveRestore />Reabrir exercício</> : <><Archive />Arquivar exercício</>}
          </Button>
        </div>

        {q.error && <p role="alert" className="mt-3 rounded-lg border border-destructive/30 p-3 text-sm text-destructive">Falha ao carregar Despesas Anuais: {q.error.message}</p>}
        {unlinkedCardCreditors.length > 0 && (
          <p role="status" className="mt-3 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-sm text-foreground">
            <strong>Cartões sem vínculo Open Finance:</strong>{" "}
            {unlinkedCardCreditors.map((r: {creditor:string})=>r.creditor).join(", ")}.
            Use o lápis do credor para escolher o cartão correto em Carteiras.
            Nenhum valor será substituído até existir um vínculo confirmado e uma fatura fechada.
          </p>
        )}
        {cardProfileQuery.data?.available === false && (
          <p role="alert" className="mt-3 rounded-lg border border-amber-500/40 p-3 text-sm">
            Vínculos e sincronização de cartões temporariamente indisponíveis: falta a tabela
            finance_account_profiles no banco. Aplicar a migração 20261107140000 antes de conectar
            cartões. Os demais credores continuam disponíveis; nenhum dado foi excluído.
          </p>
        )}
        {cardProfileQuery.error && <p role="alert" className="mt-3 rounded-lg border border-destructive/30 p-3 text-sm text-destructive">
          Falha ao consultar perfis de cartão: {cardProfileQuery.error.message}
        </p>}
        {q.data?.migrationRequired && <p role="alert" className="mt-3 rounded-lg border border-amber-500/30 p-3 text-sm">A classificação dos credores ainda depende das migrações SQL 20261109010000 e 20261109020000 no banco vinculado. O GitHub não aplica essas migrações automaticamente.</p>}
        {archived && (
          <div className="mt-4 rounded-xl border border-amber-300 bg-amber-100 p-3 text-sm font-medium text-amber-900">
            Exercício arquivado: consulta liberada, edição desabilitada.
          </div>
        )}

        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <Summary label="Total geral previsto" value={formatBRL(grandTotal)} />
          <Summary label="Valor pago no ano" value={formatBRL(stats.paidCents)} tone="text-success" />
          <Summary label="A pagar no ano" value={formatBRL(aPagar)} tone={aPagar > 0 ? "text-destructive" : undefined} />
          <Summary label="Despesas cadastradas" value={String(savedRows.length)} />
          <Summary label="Status do exercício" value={archived ? "Arquivo" : "Em andamento"} />
        </div>

        {futureCardQuery.error && <p role="alert" className="mt-3 text-sm text-destructive">Não foi possível consultar parcelas futuras dos cartões: {futureCardQuery.error.message}</p>}
        {year > new Date().getFullYear() && futureCardQuery.isSuccess && linkedFutureCards.length > 0 && cardForecasts.length === 0 && (
          <p role="status" className="mt-3 text-xs text-amber-700">
            Os cartões vinculados estão listados, mas o Open Finance não forneceu parcelas futuras identificáveis para {year}.
            Os meses sem informação permanecem vazios; não são faturas zeradas ou confirmadas.
          </p>
        )}
        {futureCardQuery.data?.warnings.map((warning,i)=><p role="alert" key={i} className="mt-2 text-xs text-amber-700">{warning}</p>)}
        <div className="mt-6 overflow-x-auto rounded-2xl border bg-card shadow-soft">
          <table className="w-full min-w-[1300px] text-sm">
            <thead>
              <tr className="bg-muted text-xs uppercase tracking-wide text-muted-foreground">
                <th className="sticky left-0 z-10 bg-muted px-3 py-2.5 text-left">Credor</th>
                <th className="px-2 py-2.5">Vencimento</th>
                {MONTHS_SHORT.map((mn) => <th key={mn} className="px-2 py-2.5 text-right">{mn}</th>)}
                <th className="px-3 py-2.5 text-right">Total anual</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {q.isLoading && <tr><td colSpan={15} className="px-3 py-8 text-center text-muted-foreground">Carregando exercício {year}…</td></tr>}
              {!q.isLoading && rows.length === 0 && (
                <tr><td colSpan={15} className="px-3 py-8 text-center text-muted-foreground">Nenhum credor cadastrado neste exercício.</td></tr>
              )}
              {rows.map((r: any) => {
                const cells = monthsByRow.get(r.id);
                const paid = new Set(q.data?.paidMonths?.[r.id] ?? []);
                const total = Array.from({ length: 12 }, (_, i) => cells?.get(i + 1) ?? 0).reduce((a, b) => a + b, 0);
                return (
                  <tr key={r.id}>
                    <td className="sticky left-0 z-10 bg-card px-3 py-1.5">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold">{r.creditor}</span>
                        {(() => {
                          const source:SourceKind = r.expense_source === "contract" || r.expense_source === "card" || r.expense_source === "consumption" || r.expense_source === "annual_tax"
                            ? r.expense_source : r.expense_kind === "consumption" ? "consumption" : "manual";
                          return <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">{sourceName(source,r.consumption_value_type,r.annual_tax_kind)}</span>;
                        })()}
                        {r.forecast_only && <span className="text-[10px] text-muted-foreground">Previsão</span>}
                        <button type="button" aria-label={`Editar credor ${r.creditor}`} title="Classificar e ajustar credor"
                          disabled={archived || r.forecast_only} className="rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-primary disabled:opacity-40"
                          onClick={() => {
                            const latest = Array.from({length:12},(_,i)=>cells?.get(12-i)??null).find(v=>v!==null && v>0);
                            const source:SourceKind = ["contract","card","consumption","annual_tax"].includes(r.expense_source)
                              ? r.expense_source : r.expense_kind==="consumption" ? "consumption" : "manual";
                            setEditCreditor({ id:r.id,creditor:r.creditor_original??r.creditor,
                              dueDay:r.due_day?String(r.due_day):"",expenseSource:source,
                              sourceContractId:r.source_contract_id??"",
                              cardAccountId:profiles.find(p=>p.annual_expense_id===r.id)?.account_id??"",
                              consumptionValueType:r.consumption_value_type==="variable"?"variable":"fixed",
                              fixedValue:latest ? (latest/100).toFixed(2).replace(".",","):"",
                              annualTaxKind:["iptu","ipva","other"].includes(r.annual_tax_kind)?r.annual_tax_kind:"iptu",
                              taxTotal:source==="annual_tax" && total>0 ? (total/100).toFixed(2).replace(".",","):"",
                              taxFirstMonth:Array.from({length:12},(_,i)=>i+1).find(m=>((cells?.get(m)??0)>0))??1,
                              taxInstallments:Math.max(1,Array.from({length:12},(_,i)=>i+1).filter(m=>(cells?.get(m)??0)>0).length),
                            });
                          }}>
                          <Pencil className="size-3.5" />
                        </button>
                      </div>
                    </td>
                    <td className="px-2 py-1.5 text-center text-muted-foreground">{r.due_day ?? "—"}</td>
                    {Array.from({ length: 12 }, (_, i) => {
                      const month = i + 1;
                      const v = cells?.get(month);
                      const editing = editCell?.id === r.id && editCell?.month === month;
                      return (
                        <td
                          key={month}
                          className={`px-1 py-1 text-right ${paid.has(month) ? "bg-success-soft" : ""} ${archived ? "" : "cursor-pointer hover:bg-accent"}`}
                          onClick={() => {
                            if (archived || editing || r.forecast_only) return;
                            setEditCell({ id: r.id, month, value: v ? (v / 100).toFixed(2).replace(".", ",") : "" });
                          }}
                        >
                          {editing ? (
                            <Input
                              autoFocus
                              className="h-8 w-24 text-right text-xs"
                              value={editCell?.value ?? ""}
                              onChange={(e) => setEditCell((c) => (c ? { ...c, value: e.target.value } : c))}
                              onBlur={commitCell}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") commitCell();
                                if (e.key === "Escape") setEditCell(null);
                              }}
                            />
                          ) : (
                            <span className={`px-2 ${paid.has(month) ? "font-semibold text-success" : ""}`}>
                              {v ? formatBRL(v) : ""}
                            </span>
                          )}
                        </td>
                      );
                    })}
                    <td className="px-3 py-1.5 text-right font-bold">{formatBRL(total)}</td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t-2 bg-muted/60 font-semibold">
                <td className="sticky left-0 z-10 bg-muted px-3 py-2">Total mensal</td>
                <td className="px-2 py-2 text-center">—</td>
                {monthTotals.map((t, i) => <td key={i} className="px-2 py-2 text-right">{formatBRL(t)}</td>)}
                <td className="px-3 py-2 text-right font-extrabold">{formatBRL(grandTotal)}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        {!archived && (
          <Button variant="outline" className="mt-4" onClick={() => setAddOpen(true)}><Plus />Cadastrar despesa</Button>
        )}
      </div>

      <Dialog open={!!editCreditor} onOpenChange={(o) => !o && setEditCreditor(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Editar despesa / credor</DialogTitle></DialogHeader>
          {editCreditor && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="ec-name">Nome</Label>
                <Input id="ec-name" maxLength={100} value={editCreditor.creditor} onChange={(e) => setEditCreditor({ ...editCreditor, creditor: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ec-day">Dia de vencimento (1 a 31, opcional)</Label>
                <Input id="ec-day" inputMode="numeric" value={editCreditor.dueDay} onChange={(e) => setEditCreditor({ ...editCreditor, dueDay: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ec-kind">Tipo de despesa</Label>
                <select id="ec-kind" className="h-10 w-full rounded-md border bg-background px-2 text-sm"
                  value={editCreditor.expenseSource} onChange={e=>setEditCreditor({...editCreditor,
                    expenseSource:e.target.value as SourceKind})}>
                  <option value="manual">Despesa avulsa / outra obrigação</option>
                  <option value="contract">Contrato parcelado</option>
                  <option value="card" disabled={!cardProfilesAvailable}>Cartão de crédito — Open Finance</option>
                  <option value="consumption">Despesa de consumo</option>
                  <option value="annual_tax">Tributo anual (IPTU / IPVA)</option>
                </select>
              </div>
              {editCreditor.expenseSource==="contract" && <div className="space-y-2">
                <Label htmlFor="ec-contract">Contrato cadastrado</Label>
                <select id="ec-contract" className="h-10 w-full rounded-md border bg-background px-2 text-sm"
                  value={editCreditor.sourceContractId} onChange={e=>setEditCreditor({...editCreditor,sourceContractId:e.target.value})}>
                  <option value="">Selecionar contrato</option>
                  {(contractsQuery.data??[]).map(contract=><option key={contract.id} value={contract.id}>{contract.name}</option>)}
                </select>
                <p className="text-xs text-muted-foreground">Ao salvar, serão geradas as competências até o último vencimento real do contrato. Valores existentes não serão substituídos.</p>
              </div>}
              {editCreditor.expenseSource==="card" && <div className="space-y-2">
                <Label htmlFor="ec-card">Cartão vinculado à Carteiras</Label>
                <select id="ec-card" className="h-10 w-full rounded-md border bg-background px-2 text-sm"
                  value={editCreditor.cardAccountId} onChange={e=>setEditCreditor({...editCreditor,cardAccountId:e.target.value})}>
                  <option value="">Selecionar cartão conectado</option>
                  {cardChoices.map(card=><option key={card.id} value={card.id}>{card.name}</option>)}
                </select>
                <p className="text-xs text-muted-foreground">Somente faturas fechadas confirmadas pelo Open Finance serão atualizadas no exercício correspondente.</p>
                {!cardProfilesAvailable && <p role="alert" className="text-xs text-amber-700">
                  O vínculo não pode ser alterado antes da migração da tabela finance_account_profiles.
                </p>}
              </div>}
              {editCreditor.expenseSource==="annual_tax" && <div className="space-y-3">
                <div className="space-y-1">
                  <Label htmlFor="ec-tax-kind">Tributo</Label>
                  <select id="ec-tax-kind" className="h-10 w-full rounded-md border bg-background px-2 text-sm"
                    value={editCreditor.annualTaxKind} onChange={e=>setEditCreditor({...editCreditor,annualTaxKind:e.target.value as AnnualTaxKind})}>
                    <option value="iptu">IPTU — imóvel</option>
                    <option value="ipva">IPVA — veículo</option>
                    <option value="other">Outro tributo anual</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="ec-tax-total">Valor total do exercício (R$)</Label>
                  <Input id="ec-tax-total" inputMode="decimal" placeholder="Informe para gerar as cobranças"
                    value={editCreditor.taxTotal} onChange={e=>setEditCreditor({...editCreditor,taxTotal:e.target.value})}/>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1"><Label htmlFor="ec-tax-month">Primeiro vencimento</Label>
                    <select id="ec-tax-month" className="h-10 w-full rounded-md border bg-background px-2 text-sm"
                      value={editCreditor.taxFirstMonth} onChange={e=>{const v=Number(e.target.value);setEditCreditor({...editCreditor,taxFirstMonth:v,taxInstallments:Math.min(editCreditor.taxInstallments,13-v)});}}>
                      {MONTHS_SHORT.map((label,i)=><option key={label} value={i+1}>{label}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1"><Label htmlFor="ec-tax-installments">Parcelas</Label>
                    <select id="ec-tax-installments" className="h-10 w-full rounded-md border bg-background px-2 text-sm"
                      value={editCreditor.taxInstallments} onChange={e=>setEditCreditor({...editCreditor,taxInstallments:Number(e.target.value)})}>
                      {Array.from({length:13-editCreditor.taxFirstMonth},(_,i)=><option key={i+1} value={i+1}>{i+1===1?"À vista":i+1}</option>)}
                    </select>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">A cobrança pertence somente ao exercício selecionado. Os valores existentes não serão sobrescritos; novos exercícios exigem os valores reais do tributo.</p>
              </div>}
              {editCreditor.expenseSource==="consumption" && <>
                <div className="space-y-2">
                  <Label htmlFor="ec-value-type">Cobrança de consumo</Label>
                  <select id="ec-value-type" className="h-10 w-full rounded-md border bg-background px-2 text-sm"
                    value={editCreditor.consumptionValueType} onChange={e=>setEditCreditor({...editCreditor,consumptionValueType:e.target.value as "fixed"|"variable"})}>
                    <option value="fixed">Fixa</option><option value="variable">Variável</option>
                  </select>
                </div>
                {editCreditor.consumptionValueType==="fixed" && <div className="space-y-2">
                  <Label htmlFor="ec-fixed">Mensalidade fixa (R$)</Label>
                  <Input id="ec-fixed" inputMode="decimal" placeholder="0,00"
                    value={editCreditor.fixedValue} onChange={e=>setEditCreditor({...editCreditor,fixedValue:e.target.value})}/>
                  <p className="text-xs text-muted-foreground">Projeção até dezembro do último ano de contratos; meses já preenchidos permanecem inalterados.</p>
                </div>}
                {editCreditor.consumptionValueType==="variable" &&
                  <p className="text-xs text-muted-foreground">Valores de cada mês são informados manualmente quando apurados. Não serão inventadas faturas futuras.</p>}
              </>}
            </div>
          )}
          <DialogFooter className="flex items-center justify-between sm:justify-between">
            <Button variant="outline" className="text-destructive" onClick={() => editCreditor && removeCreditor(editCreditor.id, editCreditor.creditor)}>
              <Trash2 />Excluir
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setEditCreditor(null)}>Cancelar</Button>
              <Button variant="brand" disabled={savingCreditor} onClick={()=>void saveCreditor()}>{savingCreditor?"Salvando…":"Salvar e atualizar"}</Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AddCreditorDialog open={addOpen} onOpenChange={setAddOpen} year={year} onSaved={refresh} contracts={contractsQuery.data??[]} cards={cardChoices} profiles={profiles} cardProfilesAvailable={cardProfilesAvailable} />
    </AppShell>
  );
}

function Summary({ label, value, tone }: { label: string; value: string; tone?: string | undefined }) {
  return (
    <div className="rounded-2xl border bg-card p-4 shadow-soft">
      <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={`mt-1.5 text-xl font-extrabold ${tone ?? "text-primary"}`}>{value}</div>
    </div>
  );
}

function AddCreditorDialog({
  open,onOpenChange,year,onSaved,contracts,cards,profiles,cardProfilesAvailable,
}:{
  open:boolean;onOpenChange:(o:boolean)=>void;year:number;onSaved:()=>void;
  contracts:ContractChoice[];cards:CardChoice[];profiles:CardProfile[];cardProfilesAvailable:boolean;
}) {
  const addFn=useServerFn(addCreditor);
  const contractFn=useServerFn(projectAnnualContract);
  const consumptionFn=useServerFn(projectFixedAnnualConsumption);
  const profileFn=useServerFn(saveFinanceAccountProfile);
  const syncProviderFn=useServerFn(syncProviderClosedCardInvoices);
  const taxFn=useServerFn(scheduleAnnualTax);
  const [name,setName]=useState("");
  const [day,setDay]=useState("");
  const [source,setSource]=useState<SourceKind>("manual");
  const [contractId,setContractId]=useState("");
  const [cardId,setCardId]=useState("");
  const [valueType,setValueType]=useState<"fixed"|"variable">("fixed");
  const [fixedValue,setFixedValue]=useState("");
  const [taxKind,setTaxKind]=useState<AnnualTaxKind>("iptu");
  const [taxTotal,setTaxTotal]=useState("");
  const [taxFirstMonth,setTaxFirstMonth]=useState(1);
  const [taxInstallments,setTaxInstallments]=useState(1);
  const [saving,setSaving]=useState(false);
  const [createdId,setCreatedId]=useState<string|null>(null);

  function close() {
    setName("");setDay("");setSource("manual");setContractId("");setCardId("");
    setValueType("fixed");setFixedValue("");
    setTaxKind("iptu");setTaxTotal("");setTaxFirstMonth(1);setTaxInstallments(1);
    setCreatedId(null);onOpenChange(false);
  }
  async function save(){
    const dueDay=day.trim()===""?null:Number(day);
    if(!name.trim() || (dueDay!==null && (!Number.isInteger(dueDay)||dueDay<1||dueDay>31))) {
      toast.error("Informe um nome e dia de vencimento válido.");return;
    }
    if(source==="contract" && !contractId){toast.error("Selecione um contrato.");return;}
    if(source==="card" && !cardProfilesAvailable){
      toast.error("Cadastro de cartão indisponível até aplicar a migração 20261107140000.");
      return;
    }
    if(source==="card" && !cardId){toast.error("Selecione um cartão conectado.");return;}
    const cents=source==="consumption" && valueType==="fixed" ? parseBRL(fixedValue) : null;
    if(source==="consumption" && valueType==="fixed" && (cents===null || cents<=0)){
      toast.error("Informe o valor mensal do consumo fixo.");return;
    }
    let taxCents:number|null=null;
    if(source==="annual_tax"){
      taxCents=parseBRL(taxTotal);
      try { annualTaxSchedule({totalCents:taxCents??0,firstMonth:taxFirstMonth,installments:taxInstallments}); }
      catch(e){toast.error(e instanceof Error?e.message:"Valor anual inválido.");return;}
    }
    setSaving(true);
    try {
      let id=createdId;
      if(!id) {
        const result=await addFn({data:{year,creditor:name.trim(),dueDay,
          expenseKind:kindFromSource(source),expenseSource:source,
          sourceContractId:source==="contract"?contractId:null,consumptionValueType:valueType,
          annualTaxKind:source==="annual_tax"?taxKind:null}});
        id=result.id;
        setCreatedId(id);
      }
      if(source==="annual_tax" && taxCents){
        const result=await taxFn({data:{expenseId:id,totalCents:taxCents,
          firstMonth:taxFirstMonth,installments:taxInstallments}});
        toast.success(`Tributo anual registrado para ${result.year}: ${result.created} competências criadas.`);
      } else if(source==="contract") {
        const result=await contractFn({data:{expenseId:id,contractId}});
        toast.success(`Parcelas distribuídas de ${result.years[0]} até ${result.years.at(-1)}; ${result.preserved} meses preservados.`);
      } else if(source==="consumption" && valueType==="fixed" && cents) {
        const result=await consumptionFn({data:{expenseId:id,monthlyCents:cents}});
        toast.success(`Consumo fixo projetado até ${result.years.at(-1)}.`);
      } else if(source==="card") {
        const profile=profiles.find(p=>p.account_id===cardId);
        if(profile?.annual_expense_id && profile.annual_expense_id!==id)
          throw new Error("Este cartão já está vinculado a outro credor. Revise a Carteiras antes de vinculá-lo novamente.");
        await profileFn({data:{accountId:cardId,annualExpenseId:id,displayName:profile?.display_name??null,
          cardBrand:(profile?.card_brand as "VISA"|"MASTERCARD"|"ELO"|"AMEX"|"HIPERCARD"|"OTHER"|null)??null}});
        try {
          const syncFn = await syncProviderFn();
          toast.success(`Cartão vinculado. ${syncFn.updated} faturas atualizadas pelo Open Finance.`);
          if(syncFn.errors.length) toast.warning(syncFn.errors.join("; ").slice(0,400));
        } catch(e) {
          toast.warning("Cartão vinculado. Faturas ainda não sincronizadas: "+(e instanceof Error?e.message:"Conexão indisponível."));
        }
      } else toast.success("Despesa cadastrada.");
      onSaved();close();
    } catch(e) {
      toast.error(e instanceof Error?e.message:"Falha ao cadastrar despesa.");
      if(createdId) toast.info("O credor já foi criado. Revise ou conclua o vínculo sem duplicá-lo.");
      onSaved();
    } finally {setSaving(false);}
  }
  return <Dialog open={open} onOpenChange={v=>{if(!v && !saving) close();}}>
    <DialogContent className="max-w-md">
      <DialogHeader><DialogTitle>Cadastrar despesa em {year}</DialogTitle></DialogHeader>
      <div className="space-y-3">
        <div className="space-y-1">
          <Label htmlFor="ac-name">Credor</Label>
          <Input id="ac-name" maxLength={100} disabled={!!createdId} value={name} onChange={e=>setName(e.target.value)}/>
        </div>
        <div className="space-y-1">
          <Label htmlFor="ac-day">Dia de vencimento</Label>
          <Input id="ac-day" inputMode="numeric" disabled={!!createdId} placeholder="1 a 31" value={day} onChange={e=>setDay(e.target.value)}/>
        </div>
        <div className="space-y-1">
          <Label htmlFor="ac-source">Classificação da despesa</Label>
          <select id="ac-source" disabled={!!createdId} className="h-10 w-full rounded-md border bg-background px-2 text-sm"
            value={source} onChange={e=>setSource(e.target.value as SourceKind)}>
            <option value="manual">Despesa avulsa / outra obrigação</option>
            <option value="contract">Contrato parcelado</option>
            <option value="card" disabled={!cardProfilesAvailable}>Cartão de crédito / Open Finance</option>
            <option value="consumption">Consumo</option>
            <option value="annual_tax">Tributo anual — IPTU / IPVA</option>
          </select>
        </div>
        {source==="contract" && <div className="space-y-1">
          <Label htmlFor="ac-contract">Contrato já cadastrado</Label>
          <select id="ac-contract" className="h-10 w-full rounded-md border bg-background px-2 text-sm"
            value={contractId} onChange={e=>setContractId(e.target.value)}>
            <option value="">Escolher contrato</option>
            {contracts.map(contract=><option key={contract.id} value={contract.id}>{contract.name}</option>)}
          </select>
          <p className="text-xs text-muted-foreground">Gerar automaticamente os anos das parcelas existentes.</p>
        </div>}
        {source==="card" && <div className="space-y-1">
          <Label htmlFor="ac-card">Cartão conectado</Label>
          <select id="ac-card" className="h-10 w-full rounded-md border bg-background px-2 text-sm" value={cardId}
            onChange={e=>setCardId(e.target.value)}>
            <option value="">Escolher cartão</option>
            {cards.map(card=><option key={card.id} value={card.id}>{card.name}</option>)}
          </select>
          <p className="text-xs text-muted-foreground">As faturas confirmadas serão sincronizadas pelas Carteiras.</p>
          {!cardProfilesAvailable && <p role="alert" className="text-xs text-amber-700">
            Primeiro aplique a migração da tabela finance_account_profiles.
          </p>}
        </div>}
        {source==="annual_tax" && <div className="space-y-3">
          <div className="space-y-1">
            <Label htmlFor="ac-tax-kind">Qual tributo?</Label>
            <select id="ac-tax-kind" className="h-10 w-full rounded-md border bg-background px-2 text-sm"
              disabled={!!createdId} value={taxKind} onChange={e=>setTaxKind(e.target.value as AnnualTaxKind)}>
              <option value="iptu">IPTU — imóvel</option>
              <option value="ipva">IPVA — veículo</option>
              <option value="other">Outro tributo anual</option>
            </select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="ac-tax-total">Valor anual devido (R$)</Label>
            <Input id="ac-tax-total" inputMode="decimal" placeholder="Ex.: 1.200,00"
              value={taxTotal} onChange={e=>setTaxTotal(e.target.value)}/>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label htmlFor="ac-tax-first">Mês de início</Label>
              <select id="ac-tax-first" className="h-10 w-full rounded-md border bg-background px-2 text-sm"
                value={taxFirstMonth} onChange={e=>{
                  const v=Number(e.target.value);setTaxFirstMonth(v);
                  setTaxInstallments(Math.min(taxInstallments,13-v));
                }}>
                {MONTHS_SHORT.map((label,i)=><option key={label} value={i+1}>{label}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="ac-tax-installments">Pagamento</Label>
              <select id="ac-tax-installments" className="h-10 w-full rounded-md border bg-background px-2 text-sm"
                value={taxInstallments} onChange={e=>setTaxInstallments(Number(e.target.value))}>
                {Array.from({length:13-taxFirstMonth},(_,i)=><option key={i+1} value={i+1}>{i===0?"À vista":`${i+1} parcelas`}</option>)}
              </select>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">O valor é lançado somente no exercício escolhido, sem criar dívidas futuras de IPTU/IPVA com valores não confirmados.</p>
        </div>}
        {source==="consumption" && <>
          <div className="space-y-1">
            <Label htmlFor="ac-type">Valor de consumo</Label>
            <select id="ac-type" className="h-10 w-full rounded-md border bg-background px-2 text-sm"
              value={valueType} onChange={e=>setValueType(e.target.value as "fixed"|"variable")}>
              <option value="fixed">Fixo mensal</option><option value="variable">Variável mensal</option>
            </select>
          </div>
          {valueType==="fixed" && <div className="space-y-1">
            <Label htmlFor="ac-fixed">Mensalidade (R$)</Label>
            <Input id="ac-fixed" value={fixedValue} inputMode="decimal" placeholder="0,00"
              onChange={e=>setFixedValue(e.target.value)}/>
          </div>}
          {valueType==="variable" &&
            <p className="text-xs text-muted-foreground">Os valores serão inseridos manualmente após cada apuração mensal.</p>}
        </>}
        {createdId && <p className="text-xs text-amber-700">Credor já registrado. Conclua a vinculação; não será criado novamente.</p>}
      </div>
      <DialogFooter>
        <Button variant="outline" disabled={saving} onClick={close}>Cancelar</Button>
        <Button variant="brand" disabled={saving} onClick={()=>void save()}>{saving?"Salvando…":"Cadastrar"}</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>;
}
