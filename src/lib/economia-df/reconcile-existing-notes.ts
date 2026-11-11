import type { FiscalDoc } from "@/lib/fiscal";
import type { FiscalNote } from "./core";

/** Reutiliza documentos já arquivados, sem baixar ou sobrescrever arquivos. */
export type ExistingNoteMatch = { note: FiscalNote; existing: FiscalDoc; reason: "access-key" | "document-id" };
export function reconcileExistingFiscalNotes(existing: FiscalDoc[], incoming: FiscalNote[]) {
  const byKey = new Map<string, FiscalDoc>();
  const byId = new Map(existing.map(doc => [doc.id, doc]));
  for (const doc of existing) if (doc.access_key && /^\d{44}$/.test(doc.access_key)) byKey.set(doc.access_key, doc);
  const matches: ExistingNoteMatch[] = [];
  const candidates: FiscalNote[] = [];
  const seen = new Set<string>();
  for (const note of incoming) {
    if (!note.documentId.trim() || !Number.isSafeInteger(note.amountCents) || note.amountCents < 0) throw new Error("Nota inválida");
    if (note.accessKey && !/^\d{44}$/.test(note.accessKey)) throw new Error("Chave fiscal inválida");
    const key = note.accessKey ? "key:" + note.accessKey : "id:" + note.documentId;
    if (seen.has(key)) continue;
    seen.add(key);
    const match = note.accessKey ? byKey.get(note.accessKey) : byId.get(note.documentId);
    if (match) matches.push({note, existing:match, reason:note.accessKey?"access-key":"document-id"});
    else candidates.push(note);
  }
  // Candidates are for human review, not automatic insertion or verified status.
  return { matches, candidates };
}
