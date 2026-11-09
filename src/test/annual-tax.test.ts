import { describe, expect, it } from "vitest";
import { annualTaxSchedule, annualTaxNeedsReview } from "@/lib/finance/annual-tax";

describe("IPTU e IPVA nas Despesas Anuais", () => {
  it("lança o tributo em um único mês quando pago à vista", () => {
    expect(annualTaxSchedule({totalCents:135521,firstMonth:3,installments:1}))
      .toEqual([{month:3,expected_cents:135521}]);
  });
  it("distribui o valor exato nas parcelas mensais do mesmo exercício", () => {
    const p=annualTaxSchedule({totalCents:10001,firstMonth:2,installments:3});
    expect(p).toEqual([{month:2,expected_cents:3334},{month:3,expected_cents:3334},{month:4,expected_cents:3333}]);
    expect(p.reduce((s,x)=>s+x.expected_cents,0)).toBe(10001);
  });
  it("não permite parcelas que ultrapassam dezembro", () => {
    expect(()=>annualTaxSchedule({totalCents:120000,firstMonth:11,installments:3})).toThrow(/exercício/);
  });
  it("não transfere automaticamente o valor de IPTU ou IPVA para outro ano", () => {
    expect(annualTaxNeedsReview(2026,2027)).toBe(true);
  });
});
