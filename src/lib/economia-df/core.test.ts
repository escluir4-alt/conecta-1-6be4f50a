import { describe, expect, it } from "vitest";
import { fiscalAgendaEvent, fiscalNoteKey, reconcileFiscalObligations, validateFiscalObligation } from "./core";
const base = { kind: "IPVA" as const, referenceYear: 2027, referenceId: "ABC1234", installment: 1, amountCents: 12000, dueDate: "2027-02-10", source: "manual" as const };
describe("Economia DF: conciliação fiscal", () => {
  it("não duplica obrigações existentes ou repetidas na importação", () => {
    const result = reconcileFiscalObligations([base], [base, {...base, referenceId:" XYZ "}, {...base, referenceId:"xyz"}]);
    expect(result.additions).toHaveLength(1);
    expect(result.duplicates).toHaveLength(2);
  });
  it("não aceita data civil impossível nem valor negativo", () => {
    expect(() => validateFiscalObligation({...base,dueDate:"2027-02-30"})).toThrow();
    expect(() => validateFiscalObligation({...base,amountCents:-1})).toThrow();
  });
  it("usa o vencimento confirmado e reconhece pagamento", () => {
    expect(fiscalAgendaEvent(base)).toMatchObject({date:"2027-02-10",status:"pending",origin:"despesas-anuais"});
    expect(fiscalAgendaEvent({...base,paidAt:"2027-02-09"}).status).toBe("completed");
  });
  it("identifica nota fiscal por chave quando disponível", () => {
    expect(fiscalNoteKey({documentType:"NFE",accessKey:"1".repeat(44),issuedAt:"2027-01-10",amountCents:100,source:"manual",documentId:"doc-1"})).toBe("1".repeat(44));
  });
});
