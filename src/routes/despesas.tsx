import { createFileRoute, Link, Outlet, useMatchRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowRight, Download, Pencil, Plus, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { AppShell, useRequireUser } from "@/components/AppShell";
import { PayDialog, type PayTarget } from "@/components/finance/PayDialog";
import { AttachmentButton } from "@/components/finance/AttachmentButton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { diffLabel, displayNote, formatBRL, formatDateBR, parseBRL } from "@/lib/finance/money";
import {
  addManualBill, deleteBillFn, exportBillsCsv, getMonthExpenses, importBillsCsv, importAxionData,
} from "@/lib/finance/finance.functions";

export const Route = createFileRoute("/despesas")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Despesas do Mês — Axion" },
      { name: "description", content: "Registro de pagamento das despesas do mês." },
      { property: "og:title", content: "Despesas do Mês — Axion" },
      { property: "og:description", content: "Registro de pagamento das despesas do mês." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: DespesasRouteView,
});

function DespesasRouteView() {
  const matchRoute = useMatchRoute();
  return matchRoute({ to: "/despesas", fuzzy: false }) ? <DespesasPage /> : <Outlet />;
}

const MONTHS = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
const YEARS = [2025, 2026, 2027, 2028, 2029, 2030, 2031];

function DespesasPage() {
  const user = useRequireUser();
  const qc = useQueryClient();
  const now = new Date();
  const [period, setPeriod] = useState(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`);
  const [payTarget, setPayTarget] = useState<PayTarget | null>(null);
  const [manualOpen, setManualOpen] = useState(false);
  const [csvOpen, setCsvOpen] = useState(false);

  const seedFn = useServerFn(importAxionData);
  const monthFn = useServerFn(getMonthExpenses);
  const exportFn = useServerFn(exportBillsCsv);
  const delFn = useServerFn(deleteBillFn);

  const seed = useQuery({ queryKey: ["seed-axion"], queryFn: () => seedFn(), enabled: !!user, staleTime: Infinity });
  const q = useQuery({
    queryKey: ["month-expenses", period],
    queryFn: () => monthFn({ data: { period } }),
    enabled: !!user && seed.isSuccess,
  });

  const bills = q.data?.bills ?? [];
  const kpis = q.data?.kpis ?? { expected: 0, paid: 0, open: 0, count: 0 };
  const [y = 2026, m = 1] = period.split("-").map(Number);

  function refresh() {
    qc.invalidateQueries({ queryKey: ["month-expenses", period] });
  }

  async function exportCsv() {
    try {
      const { csv } = await exportFn({ data: { period } });
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `despesas-${period}.csv`;
      a.click();
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  async function removeBill(id: string, creditor: string) {
    if (!window.confirm(`Excluir a conta "${creditor}" deste mês?`)) return;
    try {
      await delFn({ data: { billId: id } });
      toast.success("Conta excluída.");
      refresh();
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  return (
    <AppShell active="despesas" user={user}>
      <div className="p-6 lg:p-8">
        <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Controle financeiro</div>
        <h1 className="text-3xl font-extrabold uppercase">Registro de Pagamento</h1>
        <p className="text-sm text-muted-foreground">Sistema de pagamentos</p>

        <div className="mt-5 flex flex-wrap items-end gap-3">
          <div className="space-y-1">
            <Label>Mês</Label>
            <select
              className="h-10 rounded-md border bg-card px-3 text-sm"
              value={m}
              onChange={(e) => setPeriod(`${y}-${String(Number(e.target.value)).padStart(2, "0")}`)}
            >
              {MONTHS.map((name, i) => (
                <option key={name} value={i + 1}>{name}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <Label>Ano</Label>
            <select
              className="h-10 rounded-md border bg-card px-3 text-sm"
              value={y}
              onChange={(e) => setPeriod(`${e.target.value}-${String(m).padStart(2, "0")}`)}
            >
              {YEARS.map((yy) => (
                <option key={yy} value={yy}>{yy}</option>
              ))}
            </select>
          </div>
          <Link to="/despesas/anuais">
            <Button variant="outline">Despesas Anuais <ArrowRight /></Button>
          </Link>
          <div className="ml-auto flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => setManualOpen(true)}><Plus />Nova conta avulsa</Button>
            <Button variant="outline" onClick={() => setCsvOpen(true)}><Upload />Importar CSV</Button>
            <Button variant="outline" onClick={exportCsv}><Download />Exportar CSV</Button>
          </div>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Kpi label="Valor previsto" value={formatBRL(kpis.expected)} />
          <Kpi label="Valor pago" value={formatBRL(kpis.paid)} tone="text-success" />
          <Kpi label="Em aberto" value={formatBRL(kpis.open)} tone={kpis.open > 0 ? "text-destructive" : undefined} />
          <Kpi label="Contas do mês" value={String(kpis.count)} />
        </div>

        {(q.data?.reviewFlags ?? []).map((f) => (
          <div key={f} className="mt-4 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">{f}</div>
        ))}

        <section className="mt-6 rounded-2xl border bg-card shadow-soft">
          <h2 className="px-5 pt-5 text-lg font-bold">Despesas do Mês</h2>
          <div className="overflow-x-auto p-5 pt-3">
            <table className="w-full min-w-[1000px] text-sm">
              <thead>
                <tr className="bg-foreground text-left text-xs uppercase tracking-wide text-primary-foreground">
                  <th className="rounded-l-lg px-3 py-2.5">Credor</th>
                  <th className="px-3 py-2.5">Valor previsto</th>
                  <th className="px-3 py-2.5">Vencimento</th>
                  <th className="px-3 py-2.5">Pagamento</th>
                  <th className="px-3 py-2.5">Valor pago</th>
                  <th className="px-3 py-2.5">Diferença</th>
                  <th className="px-3 py-2.5">Observação</th>
                  <th className="rounded-r-lg px-3 py-2.5">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {q.isLoading && (
                  <tr><td colSpan={8} className="px-3 py-8 text-center text-muted-foreground">Carregando contas do mês…</td></tr>
                )}
                {!q.isLoading && bills.length === 0 && (
                  <tr><td colSpan={8} className="px-3 py-8 text-center text-muted-foreground">Nenhuma conta nesta competência.</td></tr>
                )}
                {bills.map((b) => {
                  const paid = !!b.paid_date;
                  return (
                    <tr key={b.id} className={paid ? "bg-success-soft/70" : undefined}>
                      <td className="px-3 py-2.5">
                        <div className="font-semibold">{b.creditor}</div>
                        {b.description && <div className="text-xs text-muted-foreground">{b.description}</div>}
                      </td>
                      <td className="px-3 py-2.5">{formatBRL(b.expected_cents)}</td>
                      <td className="px-3 py-2.5">{formatDateBR(b.due_date)}</td>
                      <td className="px-3 py-2.5">{formatDateBR(b.paid_date)}</td>
                      <td className="px-3 py-2.5 font-semibold">{paid ? formatBRL(b.paid_cents) : "—"}</td>
                      <td className="px-3 py-2.5 text-xs">{diffLabel(b.expected_cents, b.paid_cents)}</td>
                      <td className="max-w-56 px-3 py-2.5 text-xs">{displayNote(b)}</td>
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-1.5">
                          {paid ? (
                            <>
                              <span className="rounded-md bg-success px-2.5 py-1 text-xs font-semibold text-primary-foreground">Pago</span>
                              <button
                                aria-label="Corrigir pagamento"
                                className="grid size-8 place-items-center rounded-lg border bg-card text-muted-foreground hover:bg-accent"
                                onClick={() => setPayTarget({ kind: "bill", id: b.id, creditor: b.creditor, due_date: b.due_date, expected_cents: b.expected_cents, paid_date: b.paid_date, paid_cents: b.paid_cents, note: b.paid_note })}
                              >
                                <Pencil className="size-4" />
                              </button>
                            </>
                          ) : (
                            <>
                              <Button
                                size="sm"
                                variant="brand"
                                onClick={() => setPayTarget({ kind: "bill", id: b.id, creditor: b.creditor, due_date: b.due_date, expected_cents: b.expected_cents, paid_date: null, paid_cents: null, note: null })}
                              >
                                Pagar
                              </Button>
                              <button
                                aria-label="Excluir conta"
                                className="grid size-8 place-items-center rounded-lg border bg-card text-muted-foreground hover:bg-accent hover:text-destructive"
                                onClick={() => removeBill(b.id, b.creditor)}
                              >
                                <Trash2 className="size-4" />
                              </button>
                            </>
                          )}
                          <AttachmentButton entityType="bill" entityId={b.id} />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <PayDialog target={payTarget} onClose={() => setPayTarget(null)} onSaved={refresh} />
      <ManualBillDialog open={manualOpen} onOpenChange={setManualOpen} period={period} onSaved={refresh} />
      <CsvDialog open={csvOpen} onOpenChange={setCsvOpen} period={period} onSaved={refresh} />
    </AppShell>
  );
}

function Kpi({ label, value, tone }: { label: string; value: string; tone?: string | undefined }) {
  return (
    <div className="rounded-2xl border bg-card p-5 shadow-soft">
      <div className="text-sm font-medium text-muted-foreground">{label}</div>
      <div className={`mt-2 text-2xl font-extrabold ${tone ?? "text-primary"}`}>{value}</div>
    </div>
  );
}

function ManualBillDialog({ open, onOpenChange, period, onSaved }: { open: boolean; onOpenChange: (o: boolean) => void; period: string; onSaved: () => void }) {
  const addFn = useServerFn(addManualBill);
  const [creditor, setCreditor] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState(`${period}-05`);
  const [value, setValue] = useState("");
  const [saving, setSaving] = useState(false);

  async function save() {
    const cents = parseBRL(value);
    if (!creditor.trim() || !cents || cents <= 0 || !dueDate) {
      toast.error("Preencha credor, vencimento e valor válidos.");
      return;
    }
    setSaving(true);
    try {
      await addFn({ data: { creditor: creditor.trim(), description: description.trim() || undefined, dueDate, expectedCents: cents } });
      toast.success("Conta avulsa adicionada.");
      setCreditor(""); setDescription(""); setValue("");
      onSaved();
      onOpenChange(false);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Nova conta avulsa</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="mb-cred">Credor</Label>
            <Input id="mb-cred" value={creditor} maxLength={100} onChange={(e) => setCreditor(e.target.value)} placeholder="Ex.: Condomínio" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="mb-desc">Descrição (opcional)</Label>
            <Input id="mb-desc" value={description} maxLength={200} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="mb-date">Vencimento</Label>
              <Input id="mb-date" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="mb-val">Valor previsto</Label>
              <Input id="mb-val" inputMode="decimal" value={value} onChange={(e) => setValue(e.target.value)} placeholder="0,00" />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button variant="brand" onClick={save} disabled={saving}>{saving ? "Salvando…" : "Adicionar"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CsvDialog({ open, onOpenChange, period, onSaved }: { open: boolean; onOpenChange: (o: boolean) => void; period: string; onSaved: () => void }) {
  const importFn = useServerFn(importBillsCsv);
  const [csv, setCsv] = useState("");
  const [preview, setPreview] = useState<{ preview: any[]; skipped: string[]; errors: string[] } | null>(null);
  const [busy, setBusy] = useState(false);

  async function analyze(confirm: boolean) {
    if (!csv.trim()) {
      toast.error("Selecione ou cole o conteúdo do CSV.");
      return;
    }
    setBusy(true);
    try {
      const result = await importFn({ data: { period, csv, confirm } });
      if (confirm) {
        toast.success(`${result.imported} contas importadas.`);
        setCsv(""); setPreview(null);
        onSaved();
        onOpenChange(false);
      } else {
        setPreview(result);
      }
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Importar contas via CSV</DialogTitle></DialogHeader>
        <p className="text-xs text-muted-foreground">
          Colunas: Credor;Descrição;Vencimento;Valor previsto. Aceita separador ; ou , e datas AAAA-MM-DD ou DD/MM/AAAA.
        </p>
        <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed px-3 py-3 text-sm text-muted-foreground hover:bg-accent">
          <Upload className="size-4" /> Escolher arquivo CSV
          <input
            type="file"
            accept=".csv,text/csv,text/plain"
            className="hidden"
            onChange={async (e) => {
              const f = e.target.files?.[0];
              if (f) setCsv(await f.text());
              e.target.value = "";
            }}
          />
        </label>
        <textarea
          className="min-h-28 w-full rounded-md border bg-transparent px-3 py-2 font-mono text-xs"
          value={csv}
          onChange={(e) => { setCsv(e.target.value); setPreview(null); }}
          placeholder="Ou cole o conteúdo aqui"
        />
        {preview && (
          <div className="max-h-48 space-y-1 overflow-y-auto rounded-lg bg-muted p-3 text-xs">
            <div className="font-semibold">{preview.preview.length} contas prontas para importar</div>
            {preview.preview.slice(0, 20).map((p, i) => (
              <div key={i}>{p.creditor} · {formatDateBR(p.dueDate)} · {formatBRL(p.cents)}</div>
            ))}
            {preview.skipped.map((s) => <div key={s} className="text-muted-foreground">Ignorado: {s}</div>)}
            {preview.errors.map((s) => <div key={s} className="text-destructive">{s}</div>)}
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          {!preview ? (
            <Button variant="brand" onClick={() => analyze(false)} disabled={busy}>Gerar prévia</Button>
          ) : (
            <Button variant="brand" onClick={() => analyze(true)} disabled={busy || preview.preview.length === 0}>
              Confirmar importação
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
