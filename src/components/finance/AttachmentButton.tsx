import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Camera, FileText, Plus } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { fileToBase64, validateAttachmentFile } from "@/lib/finance/files";
import { getAttachmentUrl, listAttachments, uploadAttachment } from "@/lib/finance/finance.functions";

export function AttachmentButton({ entityType, entityId }: { entityType: "bill" | "installment" | "contract"; entityId: string }) {
  const [open, setOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const qc = useQueryClient();
  const listFn = useServerFn(listAttachments);
  const urlFn = useServerFn(getAttachmentUrl);
  const uploadFn = useServerFn(uploadAttachment);

  const q = useQuery({
    queryKey: ["attachments", entityType, entityId],
    queryFn: () => listFn({ data: { entityType, entityId } }),
    enabled: open,
  });
  const items = q.data?.attachments ?? [];

  async function openFile(id: string) {
    try {
      const { url } = await urlFn({ data: { attachmentId: id } });
      window.open(url, "_blank", "noopener");
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  async function addFiles(list: FileList | null) {
    if (!list) return;
    setUploading(true);
    try {
      for (const f of Array.from(list)) {
        const err = validateAttachmentFile(f);
        if (err) {
          toast.error(err);
          continue;
        }
        const dataBase64 = await fileToBase64(f);
        await uploadFn({ data: { entityType, entityId, fileName: f.name, mimeType: f.type, sizeBytes: f.size, dataBase64 } });
      }
      qc.invalidateQueries({ queryKey: ["attachments", entityType, entityId] });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setUploading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          aria-label="Comprovantes"
          className="relative grid size-8 place-items-center rounded-lg border bg-card text-muted-foreground hover:bg-accent"
        >
          <Camera className="size-4" />
          {items.length > 0 && (
            <span className="absolute -right-1 -top-1 grid size-4 place-items-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
              {items.length}
            </span>
          )}
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Comprovantes</DialogTitle>
        </DialogHeader>
        <div className="space-y-2">
          {q.isLoading && <p className="text-sm text-muted-foreground">Carregando…</p>}
          {!q.isLoading && items.length === 0 && <p className="text-sm text-muted-foreground">Nenhum comprovante anexado.</p>}
          {items.map((a: any) => (
            <button
              key={a.id}
              onClick={() => openFile(a.id)}
              className="flex w-full items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm hover:bg-accent"
            >
              <FileText className="size-4 shrink-0 text-primary" />
              <span className="truncate">{a.original_name}</span>
            </button>
          ))}
          <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed px-3 py-2.5 text-sm text-muted-foreground hover:bg-accent">
            <Plus className="size-4" />
            {uploading ? "Enviando…" : "Anexar comprovante"}
            <input
              type="file"
              multiple
              accept=".pdf,.jpg,.jpeg,.png,.webp"
              className="hidden"
              disabled={uploading}
              onChange={(e) => {
                addFiles(e.target.files);
                e.target.value = "";
              }}
            />
          </label>
        </div>
      </DialogContent>
    </Dialog>
  );
}
