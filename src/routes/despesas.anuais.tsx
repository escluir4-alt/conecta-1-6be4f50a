import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, ArrowRight, Archive, ArchiveRestore, Plus, Trash2 } from "lucide-react";
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

function AnuaisPage() {
  const user = useRequireUser();
  const qc = useQueryClient();
  const [year, setYear] = useState(2026);
  const [editCell, setEditCell] = useState<{ id: string; month: number; value: string } | null>(null);
  const [editCreditor, setEditCreditor] = useState<{ id: string; creditor: string; dueDay: string } | null>(null);
  const [addOpen, setAddOpen] = useState(false);

  const getFn = useServerFn(getAnnualYear);
  const cellFn = useServerFn(updateAnnualCell);
  const updCredFn = useServerFn(updateCreditor);
  const delCredFn = useServerFn(deleteCreditor);
  const archiveFn = useServerFn(setYearArchived);

  const q = useQuery({ queryKey: ["annual", year], queryFn: () => getFn({ data: { year } }), enabled: !!user });
  const rows = q.data?.rows ?? [];
  const archived = !!q.data?.year?.archived_at;
  const stats = q.data?.stats ?? { paidCents: 0, paidExpected: 0 };

  const monthsByRow = new Map<string, Map<number, number | null>>();
  for (const mm of q.data?.months ?? []) {
    if (!monthsByRow.has(mm.annual_expense_id)) monthsByRow.set(mm.annual_expense_id, new Map());
    monthsByRow.get(mm.annual_expense_id)!.set(mm.month, mm.expected_cents);
  }
  const monthTotals = Array.from({ length: 12 }, (_, i) =>
    rows.reduce((s: number, r: any) => s + (monthsByRow.get(r.id)?.get(i + 1) ?? 0), 0));
  const grandTotal = monthTotals.reduce((a, b) => a + b, 0);
  const aPagar = grandTotal - stats.paidExpected;

  function refresh() {
    qc.invalidateQueries({ queryKey: ["annual", year] });
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

  async function saveCreditor() {
    if (!editCreditor) return;
    const dueDay = editCreditor.dueDay.trim() === "" ? null : Number(editCreditor.dueDay);
    if (!editCreditor.creditor.trim() || (dueDay !== null && (isNaN(dueDay) || dueDay < 1 || dueDay > 31))) {
      toast.error("Informe um nome e um dia de vencimento entre 1 e 31.");
      return;
    }
    try {
      await updCredFn({ data: { expenseId: editCreditor.id, creditor: editCreditor.creditor.trim(), dueDay } });
      toast.success("Credor atualizado.");
      setEditCreditor(null);
      refresh();
    } catch (e) {
      toast.error((e as Error).message);
    }
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
            <Link to="/despesas"><Button variant="outline"><ArrowLeft />Despesas do Mês</Button></Link>
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
              {[...new Set([2026, ...(q.data?.years ?? []).map((yy: any) => yy.year as number)])].sort((a, b) => b - a).map((yy) => (
                <option key={yy} value={yy}>{yy}</option>
              ))}
            </select>
          </div>
          <Button variant="outline" size="sm" onClick={toggleArchive}>
            {archived ? <><ArchiveRestore />Reabrir exercício</> : <><Archive />Arquivar exercício</>}
          </Button>
        </div>

        {archived && (
          <div className="mt-4 rounded-xl border border-amber-300 bg-amber-100 p-3 text-sm font-medium text-amber-900">
            Exercício arquivado: consulta liberada, edição desabilitada.
          </div>
        )}

        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <Summary label="Total geral previsto" value={formatBRL(grandTotal)} />
          <Summary label="Valor pago no ano" value={formatBRL(stats.paidCents)} tone="text-success" />
          <Summary label="A pagar no ano" value={formatBRL(aPagar)} tone={aPagar > 0 ? "text-destructive" : undefined} />
          <Summary label="Credores registrados" value={String(rows.length)} />
          <Summary label="Status do exercício" value={archived ? "Arquivo" : "Em andamento"} />
        </div>

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
                      <button
                        className="text-left font-semibold hover:text-primary disabled:cursor-default"
                        disabled={archived}
                        onClick={() => setEditCreditor({ id: r.id, creditor: r.creditor, dueDay: r.due_day ? String(r.due_day) : "" })}
                      >
                        {r.creditor}
                      </button>
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
                            if (archived || editing) return;
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
          <Button variant="outline" className="mt-4" onClick={() => setAddOpen(true)}><Plus />Novo credor</Button>
        )}
      </div>

      <Dialog open={!!editCreditor} onOpenChange={(o) => !o && setEditCreditor(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Editar credor</DialogTitle></DialogHeader>
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
            </div>
          )}
          <DialogFooter className="flex items-center justify-between sm:justify-between">
            <Button variant="outline" className="text-destructive" onClick={() => editCreditor && removeCreditor(editCreditor.id, editCreditor.creditor)}>
              <Trash2 />Excluir
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setEditCreditor(null)}>Cancelar</Button>
              <Button variant="brand" onClick={saveCreditor}>Salvar</Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AddCreditorDialog open={addOpen} onOpenChange={setAddOpen} year={year} onSaved={refresh} />
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

function AddCreditorDialog({ open, onOpenChange, year, onSaved }: { open: boolean; onOpenChange: (o: boolean) => void; year: number; onSaved: () => void }) {
  const addFn = useServerFn(addCreditor);
  const [name, setName] = useState("");
  const [day, setDay] = useState("");
  const [saving, setSaving] = useState(false);

  async function save() {
    const dueDay = day.trim() === "" ? null : Number(day);
    if (!name.trim() || (dueDay !== null && (isNaN(dueDay) || dueDay < 1 || dueDay > 31))) {
      toast.error("Informe um nome e um dia de vencimento entre 1 e 31 (ou deixe em branco).");
      return;
    }
    setSaving(true);
    try {
      await addFn({ data: { year, creditor: name.trim(), dueDay } });
      toast.success("Credor adicionado.");
      setName(""); setDay("");
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
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>Novo credor em {year}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="ac-name">Nome</Label>
            <Input id="ac-name" maxLength={100} value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ac-day">Dia de vencimento (opcional)</Label>
            <Input id="ac-day" inputMode="numeric" value={day} onChange={(e) => setDay(e.target.value)} />
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
