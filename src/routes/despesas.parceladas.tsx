import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Archive, ArchiveRestore, ArrowLeft, MessageSquarePlus, Pencil, Plus } from "lucide-react";
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
  addContractComment, createContract, getContractDetail, getContracts, setContractArchived,
} from "@/lib/finance/finance.functions";

export const Route = createFileRoute("/despesas/parceladas")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Despesas Parceladas — Axion" },
      { name: "description", content: "Contratos parcelados e suas parcelas." },
      { property: "og:title", content: "Despesas Parceladas — Axion" },
      { property: "og:description", content: "Contratos parcelados e suas parcelas." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ParceladasPage,
});

const DETAIL_LABELS: Record<string, string> = {
  valor_acordo_cents: "Valor do acordo",
  valor_contratado_cents: "Valor contratado",
  valor_original_cents: "Valor original",
  valor_atualizado_cents: "Valor atualizado",
  saldo_quitacao_referencia_cents: "Saldo de quitação (referência)",
};

function ParceladasPage() {
  const user = useRequireUser();
  const qc = useQueryClient();
  const [includeArchived, setIncludeArchived] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [payTarget, setPayTarget] = useState<PayTarget | null>(null);
  const [newOpen, setNewOpen] = useState(false);
  const [comment, setComment] = useState("");

  const listFn = useServerFn(getContracts);
  const detailFn = useServerFn(getContractDetail);
  const archiveFn = useServerFn(setContractArchived);
  const commentFn = useServerFn(addContractComment);

  const listQ = useQuery({
    queryKey: ["contracts", includeArchived],
    queryFn: () => listFn({ data: { includeArchived } }),
    enabled: !!user,
  });
  const contracts = listQ.data ?? [];
  const current = contracts.find((c: any) => c.id === selected) ?? contracts[0];

  const detailQ = useQuery({
    queryKey: ["contract", current?.id ?? ""],
    queryFn: () => detailFn({ data: { contractId: current!.id } }),
    enabled: !!current,
  });
  const detail = detailQ.data;

  function refresh() {
    qc.invalidateQueries({ queryKey: ["contracts"] });
    if (current) qc.invalidateQueries({ queryKey: ["contract", current.id] });
  }

  async function toggleArchive() {
    if (!current) return;
    const archived = !!current.archived_at;
    if (!window.confirm(`Deseja ${archived ? "reabrir" : "arquivar"} o contrato "${current.name}"? Pagamentos e histórico são preservados.`)) return;
    try {
      await archiveFn({ data: { contractId: current.id, archived: !archived } });
      toast.success(archived ? "Contrato reaberto." : "Contrato arquivado (somente leitura).");
      refresh();
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  async function sendComment() {
    if (!current || !comment.trim()) return;
    try {
      await commentFn({ data: { contractId: current.id, text: comment.trim() } });
      setComment("");
      toast.success("Comentário registrado.");
      qc.invalidateQueries({ queryKey: ["contract", current.id] });
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  const archivedContract = !!current?.archived_at;
  const details = (current?.details_json ?? {}) as Record<string, number>;

  return (
    <AppShell active="parceladas" user={user}>
      <div className="p-6 lg:p-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Controle financeiro</div>
            <h1 className="text-3xl font-extrabold">Parcelas por dívida</h1>
            <p className="text-sm text-muted-foreground">Contratos parcelados</p>
          </div>
          <Link to="/despesas/anuais"><Button variant="outline"><ArrowLeft />Despesas anuais</Button></Link>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-2">
          <div className="flex flex-wrap gap-1 rounded-xl bg-muted p-1">
            {contracts.map((c: any) => (
              <button
                key={c.id}
                onClick={() => setSelected(c.id)}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                  current?.id === c.id ? "bg-card font-semibold shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {c.name}
                {c.archived_at ? " (arquivado)" : ""}
              </button>
            ))}
          </div>
          <Button variant="outline" size="sm" onClick={() => setNewOpen(true)}><Plus />Novo contrato ou parcelamento</Button>
          <Button variant="ghost" size="sm" onClick={() => setIncludeArchived(!includeArchived)}>
            {includeArchived ? "Ocultar arquivados" : "Ver contratos arquivados"}
          </Button>
        </div>

        {current && detail && (
          <>
            <div className="mt-5 flex flex-wrap items-center gap-2">
              <Button variant="outline" size="sm" onClick={toggleArchive}>
                {archivedContract ? <><ArchiveRestore />Reabrir contrato</> : <><Archive />Arquivar contrato</>}
              </Button>
              {current.description && <span className="text-sm text-muted-foreground">{current.description}</span>}
            </div>

            {archivedContract && (
              <div className="mt-4 rounded-xl border border-amber-300 bg-amber-100 p-3 text-sm font-medium text-amber-900">
                Contrato arquivado: consulta liberada, edição desabilitada.
              </div>
            )}

            <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
              <Info label="Valor do contrato" value={details["valor_acordo_cents"] ?? details["valor_contratado_cents"] ? formatBRL(details["valor_acordo_cents"] ?? details["valor_contratado_cents"] ?? 0) : "—"} />
              <Info label="Quantidade de parcelas" value={String(detail.kpis.count)} />
              <Info label="Primeiro vencimento" value={formatDateBR(detail.kpis.firstDue)} />
              <Info label="Último vencimento" value={formatDateBR(detail.kpis.lastDue)} />
              <Info label="Situação" value={archivedContract ? "Arquivado" : "Ativo"} />
            </div>
            {Object.entries(details).filter(([k]) => k !== "valor_acordo_cents" && k !== "valor_contratado_cents").length > 0 && (
              <div className="mt-3 flex flex-wrap gap-4 text-xs text-muted-foreground">
                {Object.entries(details)
                  .filter(([k]) => k !== "valor_acordo_cents" && k !== "valor_contratado_cents")
                  .map(([k, v]) => (
                    <span key={k}>{DETAIL_LABELS[k] ?? k}: <strong className="text-foreground">{formatBRL(v)}</strong></span>
                  ))}
              </div>
            )}

            <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-2xl bg-primary p-5 text-primary-foreground shadow-soft">
                <div className="text-xs font-semibold uppercase tracking-wide opacity-80">Total das parcelas</div>
                <div className="mt-1.5 text-2xl font-extrabold">{formatBRL(detail.kpis.total)}</div>
              </div>
              <div className="rounded-2xl border bg-card p-5 shadow-soft">
                <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Valor pago</div>
                <div className="mt-1.5 text-2xl font-extrabold text-success">{formatBRL(detail.kpis.paid)}</div>
              </div>
              <div className="rounded-2xl border bg-card p-5 shadow-soft">
                <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Saldo restante</div>
                <div className="mt-1.5 text-2xl font-extrabold text-destructive">{formatBRL(detail.kpis.remaining)}</div>
              </div>
              <div className="rounded-2xl border bg-card p-5 shadow-soft">
                <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Pagas / Restantes</div>
                <div className="mt-1.5 text-2xl font-extrabold">
                  {detail.kpis.paidCount} / {detail.kpis.count - detail.kpis.paidCount} · {detail.kpis.pct.toFixed(1).replace(".", ",")}%
                </div>
              </div>
            </div>

            <div className="mt-6 overflow-auto rounded-2xl border bg-card shadow-soft" style={{ maxHeight: "32rem" }}>
              <table className="w-full min-w-[1100px] text-sm">
                <thead className="sticky top-0 z-10">
                  <tr className="bg-muted text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="px-3 py-2.5 text-left">Parcela</th>
                    <th className="px-3 py-2.5 text-right">Valor previsto</th>
                    <th className="px-3 py-2.5">Vencimento</th>
                    <th className="px-3 py-2.5">Pagamento</th>
                    <th className="px-3 py-2.5 text-right">Valor pago</th>
                    <th className="px-3 py-2.5">Diferença</th>
                    <th className="px-3 py-2.5 text-left">Observação</th>
                    <th className="px-3 py-2.5">Comprovante</th>
                    <th className="px-3 py-2.5">Ajuste</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {detail.entries.map((e: any) => {
                    const paid = !!e.paid_date;
                    return (
                      <tr key={e.id} className={paid ? "bg-success-soft/70" : undefined}>
                        <td className="px-3 py-2 font-semibold">{e.number}</td>
                        <td className="px-3 py-2 text-right">{formatBRL(e.expected_cents)}</td>
                        <td className="px-3 py-2 text-center">{formatDateBR(e.due_date)}</td>
                        <td className="px-3 py-2 text-center">{formatDateBR(e.paid_date)}</td>
                        <td className="px-3 py-2 text-right font-semibold">{paid ? formatBRL(e.paid_cents) : "—"}</td>
                        <td className="px-3 py-2 text-center text-xs">{diffLabel(e.expected_cents, e.paid_cents)}</td>
                        <td className="max-w-52 px-3 py-2 text-xs">{displayNote(e)}</td>
                        <td className="px-3 py-2">
                          <div className="flex justify-center">
                            <AttachmentButton entityType="installment" entityId={`${current.id}:${e.number}`} />
                          </div>
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex justify-center">
                            {!archivedContract && (
                              <button
                                aria-label={paid ? "Ajustar pagamento" : "Registrar pagamento"}
                                className="grid size-8 place-items-center rounded-lg border bg-card text-muted-foreground hover:bg-accent"
                                onClick={() =>
                                  setPayTarget({
                                    kind: "installment", contractId: current.id, number: e.number, creditor: current.name,
                                    due_date: e.due_date, expected_cents: e.expected_cents,
                                    paid_date: e.paid_date, paid_cents: e.paid_cents, note: e.note,
                                  })
                                }
                              >
                                <Pencil className="size-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <section className="mt-6 rounded-2xl border bg-card p-5 shadow-soft">
              <h2 className="text-lg font-bold">Comentários do contrato</h2>
              <div className="mt-3 space-y-2">
                {(detail.comments ?? []).length === 0 && <p className="text-sm text-muted-foreground">Nenhum comentário registrado.</p>}
                {(detail.comments ?? []).map((c: any) => (
                  <div key={c.id} className="rounded-lg bg-muted px-3 py-2 text-sm">
                    <div className="text-xs text-muted-foreground">
                      {c.author ?? "Titular"} · {new Date(c.created_at).toLocaleString("pt-BR")}
                    </div>
                    <div className="mt-0.5">{c.text}</div>
                  </div>
                ))}
              </div>
              {!archivedContract && (
                <div className="mt-3 flex gap-2">
                  <Input
                    value={comment}
                    maxLength={1500}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Escreva um comentário (máx. 1500 caracteres)"
                  />
                  <Button variant="brand" onClick={sendComment} disabled={!comment.trim()}>
                    <MessageSquarePlus />Comentar
                  </Button>
                </div>
              )}
            </section>
          </>
        )}

        {!current && !listQ.isLoading && (
          <div className="mt-10 rounded-2xl border border-dashed bg-card p-12 text-center text-sm text-muted-foreground">
            Nenhum contrato parcelado cadastrado.
          </div>
        )}
      </div>

      <PayDialog target={payTarget} onClose={() => setPayTarget(null)} onSaved={refresh} />
      <NewContractDialog open={newOpen} onOpenChange={setNewOpen} onSaved={refresh} />
    </AppShell>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border bg-card p-4 shadow-soft">
      <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-1.5 text-lg font-extrabold">{value}</div>
    </div>
  );
}

function NewContractDialog({ open, onOpenChange, onSaved }: { open: boolean; onOpenChange: (o: boolean) => void; onSaved: () => void }) {
  const createFn = useServerFn(createContract);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [count, setCount] = useState("12");
  const [firstDue, setFirstDue] = useState("");
  const [total, setTotal] = useState("");
  const [saving, setSaving] = useState(false);

  async function save() {
    const n = Number(count);
    const cents = parseBRL(total);
    if (!name.trim() || !firstDue || !cents || cents <= 0 || isNaN(n) || n < 1 || n > 180) {
      toast.error("Preencha nome, quantidade (1 a 180), primeiro vencimento e valor total válidos.");
      return;
    }
    setSaving(true);
    try {
      await createFn({ data: { name: name.trim(), description: description.trim() || undefined, count: n, firstDueDate: firstDue, totalCents: cents } });
      toast.success("Contrato criado com parcelas mensais.");
      setName(""); setDescription(""); setCount("12"); setFirstDue(""); setTotal("");
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
        <DialogHeader><DialogTitle>Novo contrato ou parcelamento</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="nc-name">Nome</Label>
            <Input id="nc-name" maxLength={100} value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: Financiamento do carro" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="nc-desc">Descrição (opcional)</Label>
            <Input id="nc-desc" maxLength={500} value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="nc-count">Quantidade de parcelas</Label>
              <Input id="nc-count" inputMode="numeric" value={count} onChange={(e) => setCount(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="nc-first">Primeiro vencimento</Label>
              <Input id="nc-first" type="date" value={firstDue} onChange={(e) => setFirstDue(e.target.value)} />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="nc-total">Valor total</Label>
            <Input id="nc-total" inputMode="decimal" value={total} onChange={(e) => setTotal(e.target.value)} placeholder="0,00" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button variant="brand" onClick={save} disabled={saving}>{saving ? "Criando…" : "Criar contrato"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
