import { describe, expect, it } from "vitest";
import { consolidateGlobalDebt, globalPanelIndicators } from "@/lib/finance/global-debt";

const installments = Array.from({ length: 24 }, (_, i) => ({
  contract_id: "c1", number: i + 1, expected_cents: 100000, paid_cents: i < 3 ? 100000 : null,
}));
const bill = (o: Partial<any>) => ({ id: "b", creditor: "X", due_date: "2026-11-10", expected_cents: 0, paid_cents: null,
  source_annual_id: null, source_period: null, contract_id: null, installment_number: null, ...o });

describe("indicadores globais do painel", () => {
  it("contrato de R$ 24.000 em 24 parcelas entra uma vez, com parcelas pagas no total pago", () => {
    const r = consolidateGlobalDebt({ bills: [], annual: [], annualMonths: [], contractIds: ["c1"], installments });
    expect(r.expected).toBe(2400000);
    expect(r.paid).toBe(300000);
    expect(r.open).toBe(2100000);
  });
  it("espelho da parcela no mês não duplica o contrato", () => {
    const r = consolidateGlobalDebt({ bills: [bill({ id: "m", expected_cents: 100000, paid_cents: 100000, contract_id: "c1", installment_number: 4 })],
      annual: [], annualMonths: [], contractIds: ["c1"], installments });
    expect(r.expected).toBe(2400000);
    expect(r.paid).toBe(400000);
  });
  it("soma contas avulsas e anuais de todos os anos, sem duplicar a conta gerada pelo anual", () => {
    const r = consolidateGlobalDebt({
      bills: [bill({ id: "a", expected_cents: 5000 }), bill({ id: "g", expected_cents: 20000, paid_cents: 20000, source_annual_id: "y", source_period: "2027-01" })],
      annual: [{ id: "y", year: 2027 }], annualMonths: [{ annual_expense_id: "y", month: 1, expected_cents: 20000 }, { annual_expense_id: "y", month: 2, expected_cents: 20000 }],
      contractIds: [], installments: [] });
    expect(r.expected).toBe(45000);
    expect(r.paid).toBe(20000);
  });
  it("% quitado global e cartão somado só pelo saldo não conciliado", () => {
    expect(globalPanelIndicators({ expected: 2400000, paid: 600000 }, 50000, 50000)).toEqual({ total: 2400000, paid: 600000, open: 1800000, pct: 25 });
  });
});
