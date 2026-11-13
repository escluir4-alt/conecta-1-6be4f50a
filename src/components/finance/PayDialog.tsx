import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Paperclip, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { expensePaymentAdjustment, formatAdjustmentPercent, formatBRL, formatDateBR, parseBRL } from "@/lib/finance/money";
import { fileToBase64, validateAttachmentFile } from "@/lib/finance/files";
import { payBillFn, payInstallmentFn, reviseBillFn, reviseInstallmentFn, uploadAttachment } from "@/lib/finance/finance.functions";

export type PayTarget = {
  creditor: string;
  due_date: string;
  expected_cents: number;
  paid_date: string | null;
  paid_cents: number | null;
  note: string | null;
  is_settled?: boolean | null;
} & (
  | { kind: "bill"; id: string }
  | { kind: "installment"; contractId: string; number: number }
);

export function PayDialog({ target, onClose, onSaved }: { target: PayTarget | null; onClose: () => void; onSaved: () => void }) {
  const payBill = useServerFn(payBillFn);
  const reviseBill = useServerFn(reviseBillFn);
  const payInst = useServerFn(payInstallmentFn);
  const reviseInst = useServerFn(reviseInstallmentFn);
  const upload = useServerFn(uploadAttachment);

  const [date, setDate] = useState("");
  const [value, setValue] = useState("");
  const [note, setNote] = useState("");
  const [quits, setQuits] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [saving, setSaving] = useState(false);

  const isRevision = !!target?.paid_date;
  const centsPreview = parseBRL(value);
  const adjustment = target && centsPreview !== null
    ? expensePaymentAdjustment(target.expected_cents, centsPreview, quits) : null;

  useEffect(() => {
    if (target) {
      setDate(target.paid_date ?? new Date().toISOString().slice(0, 10));
      setValue(((target.paid_cents ?? target.expected_cents) / 100).toFixed(2).replace(".", ","));
      setNote(target.note ?? "");
      setQuits(Boolean(target.is_settled));
      setFiles([]);
    }
  }, [target]);

  function pickFiles(list: FileList | null) {
    if (!list) return;
    const next: File[] = [];
    for (const f of Array.from(list)) {
      const err = validateAttachmentFile(f);
      if (err) toast.error(err);
      else next.push(f);
    }
    setFiles((prev) => [...prev, ...next]);
  }

  async function confirm() {
    if (!target) return;
    const cents = parseBRL(value);
    if (!cents || cents <= 0) {
      toast.error("Informe um valor pago válido.");
      return;
    }
    if (!date) {
      toast.error("Informe a data do pagamento.");
      return;
    }
    setSaving(true);
    let paymentSaved = false;
    try {
      if (target.kind === "bill") {
        const payload = { billId: target.id, paidDate: date, paidCents: cents, note, quits };
        if (isRevision) await reviseBill({ data: payload });
        else await payBill({ data: payload });
      } else {
        const payload = { contractId: target.contractId, number: target.number, paidDate: date, paidCents: cents, note, quits };
        if (isRevision) await reviseInst({ data: payload });
        else await payInst({ data: payload });
      }
      paymentSaved = true;
      const entityType = target.kind === "bill" ? "bill" : "installment";
      const entityId = target.kind === "bill" ? target.id : `${target.contractId}:${target.number}`;
      for (const f of files) {
        const dataBase64 = await fileToBase64(f);
        await upload({ data: { entityType, entityId, fileName: f.name, mimeType: f.type, sizeBytes: f.size, dataBase64 } });
      }
      toast.success(isRevision ? "Pagamento corrigido com auditoria." : "Pagamento registrado.");
      onSaved();
      onClose();
    } catch (e) {
      if (paymentSaved) {
        toast.warning("Pagamento registrado, mas não foi possível anexar todos os comprovantes. Abra o ícone de comprovantes para tentar novamente.", { description: (e as Error).message });
        onSaved();
        onClose();
      } else {
        toast.error((e as Error).message);
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={!!target} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        {target && (
          <>
            <DialogHeader>
              <DialogTitle>{isRevision ? "Corrigir pagamento" : "Registrar pagamento"}</DialogTitle>
              <DialogDescription>
                {target.creditor}
                {target.kind === "installment" ? ` · Parcela ${target.number}` : ""}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-xl bg-muted p-3">
                  <div className="text-xs text-muted-foreground">Vencimento</div>
                  <div className="font-semibold">{formatDateBR(target.due_date)}</div>
                </div>
                <div className="rounded-xl bg-muted p-3">
                  <div className="text-xs font-semibold text-foreground/75">Valor devido</div>
                  <div className="mt-1 text-lg font-extrabold tracking-tight text-foreground">{formatBRL(target.expected_cents)}</div>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="pay-date">Data do pagamento</Label>
                <Input id="pay-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pay-value">Valor pago</Label>
                <div className="flex items-center gap-3 rounded-md border bg-background px-2">
                  <Input id="pay-value" className="border-0 px-1 shadow-none focus-visible:ring-0" inputMode="decimal" value={value} onChange={(e) => setValue(e.target.value)} placeholder="0,00" />
                  <label htmlFor="pay-quits" className="flex shrink-0 cursor-pointer items-center gap-2 border-l pl-3 text-sm font-semibold">
                    <Checkbox id="pay-quits" checked={quits} onCheckedChange={(checked) => setQuits(checked === true)} />
                    Quita
                  </label>
                </div>
                {adjustment && (
                  <div aria-live="polite" className="rounded-md bg-muted/50 px-3 py-2 text-xs">
                    {adjustment.kind === "discount" && (
                      <p className="font-semibold text-blue-600 dark:text-blue-400">
                        Desconto: {formatAdjustmentPercent(adjustment.percent)} · {formatBRL(adjustment.differenceCents)}
                        <span className="mt-1 block text-muted-foreground">Obrigação quitada; saldo R$ 0,00.</span>
                      </p>
                    )}
                    {adjustment.kind === "surcharge" && (
                      <p className="font-semibold text-red-600 dark:text-red-400">
                        Acréscimo: {formatAdjustmentPercent(adjustment.percent)} · {formatBRL(adjustment.differenceCents)}
                        <span className="mt-1 block text-muted-foreground">Obrigação quitada; saldo R$ 0,00.</span>
                      </p>
                    )}
                    {adjustment.kind === "settled" && <p className="font-semibold text-success">Quitado sem diferença · Saldo R$ 0,00.</p>}
                    {adjustment.kind === "open" && (
                      <p className="text-amber-700 dark:text-amber-300">
                        {adjustment.openCents > 0
                          ? `Pagamento parcial · Saldo em aberto: ${formatBRL(adjustment.openCents)}`
                          : "Pagamento informado, mas quitação não confirmada."}
                      </p>
                    )}
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="pay-note">Observação (opcional)</Label>
                <textarea
                  id="pay-note"
                  maxLength={1000}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="min-h-20 w-full rounded-md border bg-transparent px-3 py-2 text-sm"
                  placeholder="Ex.: pago com desconto por antecipação"
                />
              </div>
              <div className="space-y-2">
                <Label>Comprovantes (PDF, JPEG, PNG ou WEBP até 1.250.000 bytes cada)</Label>
                <label className="flex cursor-pointer items-center gap-2 rounded-md border border-dashed px-3 py-2.5 text-sm text-muted-foreground hover:bg-accent">
                  <Paperclip className="size-4" />
                  Anexar comprovante
                  <input
                    type="file"
                    multiple
                    accept=".pdf,.jpg,.jpeg,.png,.webp"
                    className="hidden"
                    onChange={(e) => {
                      pickFiles(e.target.files);
                      e.target.value = "";
                    }}
                  />
                </label>
                {files.map((f, i) => (
                  <div key={`${f.name}-${i}`} className="flex items-center justify-between rounded-md bg-muted px-3 py-1.5 text-sm">
                    <span className="truncate">{f.name}</span>
                    <button aria-label="Remover arquivo" onClick={() => setFiles(files.filter((_, j) => j !== i))}>
                      <X className="size-4 text-muted-foreground" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={onClose}>Cancelar</Button>
              <Button variant="brand" onClick={confirm} disabled={saving}>
                {saving ? "Salvando…" : isRevision ? "Salvar correção" : "Confirmar pagamento"}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
