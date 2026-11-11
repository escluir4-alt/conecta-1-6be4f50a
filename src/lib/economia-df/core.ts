/**
 * Axion Economia DF — núcleo de integração independente de UI.
 * Não consulta débitos pessoais sem uma fonte autorizada.
 * Conectores externos devem fornecer dados confirmados e indicar sua origem.
 */
export type FiscalKind = "IPVA" | "IPTU" | "TLP";
export type FiscalSource = "official-api" | "authorized-import" | "manual";
export type FiscalObligation = {
  kind: FiscalKind;
  referenceYear: number;
  referenceId: string; // Identificador do veículo/imóvel, não expor em logs
  installment: number;
  amountCents: number;
  dueDate: string; // YYYY-MM-DD, data civil sem fuso
  source: FiscalSource;
  sourceDocumentId?: string;
  paidAt?: string;
};
export type FiscalNote = {
  documentType: "NFE" | "NFCE" | "NFSE";
  accessKey?: string;
  issuer?: string;
  issuedAt: string;
  amountCents: number;
  source: FiscalSource;
  documentId: string;
};
const civilDate = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;
function validDate(date: string): boolean {
  if (!civilDate.test(date)) return false;
  const [y,m,d] = date.split("-").map(Number);
  const actual = new Date(Date.UTC(y,m-1,d));
  return actual.getUTCFullYear() === y && actual.getUTCMonth() === m-1 && actual.getUTCDate() === d;
}
export function fiscalObligationKey(o: Pick<FiscalObligation,"kind"|"referenceYear"|"referenceId"|"installment">): string {
  return JSON.stringify([o.kind,o.referenceYear,o.referenceId.trim().toUpperCase(),o.installment]);
}
export function validateFiscalObligation(o: FiscalObligation): void {
  if (!["IPVA","IPTU","TLP"].includes(o.kind)) throw new Error("Tributo inválido");
  if (!Number.isInteger(o.referenceYear) || o.referenceYear < 2000 || o.referenceYear > 2200) throw new Error("Ano inválido");
  if (!o.referenceId.trim()) throw new Error("Referência obrigatória");
  if (!Number.isInteger(o.installment) || o.installment < 0) throw new Error("Parcela inválida");
  if (!Number.isSafeInteger(o.amountCents) || o.amountCents < 0) throw new Error("Valor inválido");
  if (!validDate(o.dueDate)) throw new Error("Vencimento inválido");
  if (!["official-api","authorized-import","manual"].includes(o.source)) throw new Error("Origem inválida");
}
export function reconcileFiscalObligations(existing: FiscalObligation[], incoming: FiscalObligation[]) {
  const keys = new Set(existing.map(fiscalObligationKey));
  const additions: FiscalObligation[] = [];
  const duplicates: FiscalObligation[] = [];
  for (const item of incoming) {
    validateFiscalObligation(item);
    const key = fiscalObligationKey(item);
    if (keys.has(key)) duplicates.push(item);
    else { keys.add(key); additions.push(item); }
  }
  // Não altera registros pagos, não grava automaticamente no banco.
  return { additions, duplicates };
}
export function fiscalAgendaEvent(o: FiscalObligation) {
  validateFiscalObligation(o);
  return {
    externalKey: "economia-df:" + fiscalObligationKey(o),
    title: "Vencimento " + o.kind,
    date: o.dueDate,
    status: o.paidAt ? "completed" as const : "pending" as const,
    origin: "despesas-anuais" as const,
  };
}
export function validateFiscalNote(n: FiscalNote): void {
  if (!["NFE","NFCE","NFSE"].includes(n.documentType)) throw new Error("Tipo de nota inválido");
  if (!n.documentId.trim() || !Number.isSafeInteger(n.amountCents) || n.amountCents < 0) throw new Error("Nota inválida");
  if (!Number.isFinite(Date.parse(n.issuedAt))) throw new Error("Data de emissão inválida");
  if (n.accessKey && !/^\d{44}$/.test(n.accessKey)) throw new Error("Chave de acesso inválida");
}
export function fiscalNoteKey(n: FiscalNote): string {
  validateFiscalNote(n);
  return n.accessKey || n.documentType + ":" + n.documentId;
}
