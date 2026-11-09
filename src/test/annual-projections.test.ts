import { describe, expect, it } from "vitest";
import { contractProjection, fixedConsumptionProjection, missingProjections } from "@/lib/finance/annual-projections";

describe("projeções anuais por fonte", () => {
  it("distribui parcelas em anos até 2031 somando vencimentos no mesmo mês", () => {
    const periods = contractProjection([
      {due_date:"2026-12-13",expected_cents:150000},
      {due_date:"2027-01-13",expected_cents:150000},
      {due_date:"2027-01-20",expected_cents:25000},
      {due_date:"2031-04-13",expected_cents:150000},
    ],2026);
    expect(periods).toEqual([
      {year:2026,month:12,expected_cents:150000},
      {year:2027,month:1,expected_cents:175000},
      {year:2031,month:4,expected_cents:150000},
    ]);
  });
  it("não recria competências com valores manuais ou pagos", () => {
    expect(missingProjections(contractProjection([{due_date:"2027-01-10",expected_cents:9000},{due_date:"2027-02-10",expected_cents:9000}],2026),[
      {year:2027,month:1},
    ])).toEqual([{year:2027,month:2,expected_cents:9000}]);
  });
  it("projeta consumo fixo até o último dezembro sem inventar consumos variáveis", () => {
    const p=fixedConsumptionProjection(2028,2050,11990);
    expect(p).toHaveLength(276);
    expect(p[0]).toEqual({year:2028,month:1,expected_cents:11990});
    expect(p.at(-1)).toEqual({year:2050,month:12,expected_cents:11990});
  });
});
