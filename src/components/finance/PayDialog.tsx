import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Paperclip, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { formatBRL, formatDateBR, parseBRL } from "@/lib/finance/money";
import { fileToBase64, validateAttachmentFile } from "@/lib/finance/files";
import { payBillFn, payInstallmentFn, reviseBillFn, reviseInstallmentFn, uploadAttachment } from "@/lib/finance/finance.functions";

export type PayTarget = {
  creditor: string;
  due_date: string;
  expected_cents: number;
  paid_date: string | null;
  paid_cents: number | null;
  note: string | null;
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
  const [files, setFiles] = useState<File[]>([]);
  const [saving, setSaving] = useState(false);

  const isRevision = !!target?.paid_date;

  useEffect(() => {
    if (target) {
      setDate(target.paid_date ?? new Date().toISOString().slice(0, 10));
      setValue(((target.paid_cents ?? target.expected_cents) / 100).toFixed(2).replace(".", ","));
      setNote(target.note ?? "");
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
    try {
      if (target.kind === "bill") {
        const payload = { billId: target.id, paidDate: date, paidCents: cents, note };
        if (isRevision) await reviseBill({ data: payload });
        else await payBill({ data: payload });
      } else {
        const payload = { contractId: target.contractId, number: target.number, paidDate: date, paidCents: cents, note };
        if (isRevision) await reviseInst({ data: payload });
        else await payInst({ data: payload });
      }
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
      toast.error((e as Error).message);
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
                  <div className="text-xs text-muted-foreground">Valor previsto</div>
                  <div className="font-semibold">{formatBRL(target.expected_cents)}</div>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="pay-date">Data do pagamento</Label>
                <Input id="pay-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pay-value">Valor pago</Label>
                <Input id="pay-value" inputMode="decimal" value={value} onChange={(e) => setValue(e.target.value)} placeholder="0,00" />
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
