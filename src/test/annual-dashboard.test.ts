import { describe, expect, it } from "vitest";
import { consolidateAnnualDashboard, summarizeConsumptionForPeriod } from "@/lib/finance/annual-dashboard";

const row = (id: string, year: number, expense_kind: "debt" | "consumption" = "debt") =>
  ({ id, year, expense_kind });
const cell = (annual_expense_id: string, month: number, expected_cents: number | null) =>
  ({ annual_expense_id, month, expected_cents });
const payment = (source_annual_id: string, source_period: string, paid_cents: number | null) =>
  ({ source_annual_id, source_period, paid_cents, paid_date: "2026-11-01" });

describe("Resumo Anual — fonte exclusiva Despesas Anuais", () => {
  it("soma somente células do exercício vigente e valores pagos vinculados", () => {
    const result = consolidateAnnualDashboard({
      year: 2026, currentMonth: 11,
      rows: [row("carro", 2026), row("carro-2027", 2027)],
      cells: [
        cell("carro", 1, 150000), cell("carro", 2, 150000),
        cell("carro-2027", 1, 150000),
      ],
      payments: [payment("carro", "2026-01", 150000), payment("carro-2027", "2027-01", 150000)],
    });
    expect(result).toMatchObject({ year: 2026, expected: 300000, paid: 150000, open: 150000, pct: 50 });
  });

  it("não inclui saldo de cartão, contrato ou conta avulsa sem célula anual", () => {
    const result = consolidateAnnualDashboard({
      year: 2026, currentMonth: 11,
      rows: [row("a", 2026)],
      cells: [cell("a", 11, 95000)],
      payments: [payment("avulsa", "2026-11", 70000)],
    });
    expect(result.expected).toBe(95000);
    expect(result.paid).toBe(0);
  });

  it("exclui consumo das dívidas e apura apenas competências passadas e o mês atual", () => {
    const result = consolidateAnnualDashboard({
      year: 2026, currentMonth: 11,
      rows: [row("financiamento", 2026), row("nio", 2026, "consumption"), row("agua", 2026, "consumption")],
      cells: [
        cell("financiamento", 11, 150000),
        cell("nio", 10, 11990), cell("nio", 11, 11990), cell("nio", 12, 11990),
        cell("agua", 11, 8500), cell("agua", 12, null),
      ],
      payments: [payment("nio", "2026-10", 11990), payment("nio", "2026-11", 6000)],
    });
    expect(result.expected).toBe(150000);
    expect(result.consumption).toEqual({ apurado: 32480, pago: 17990, month: 20490 });
  });

  it("não duplica pagamentos espelhados e não reduz principal abaixo de zero", () => {
    const result = consolidateAnnualDashboard({
      year: 2026, currentMonth: 1,
      rows: [row("b", 2026)],
      cells: [cell("b", 1, 10000)],
      payments: [payment("b", "2026-01", 11000), payment("b", "2026-01", 11000)],
    });
    expect(result).toMatchObject({ expected: 10000, paid: 10000, open: 0, pct: 100 });
  });

  it("não contabiliza valor pago sem confirmação de baixa", () => {
    const result=consolidateAnnualDashboard({
      year:2026,currentMonth:11,rows:[row("a",2026)],
      cells:[cell("a",11,10000)],
      payments:[{source_annual_id:"a",source_period:"2026-11",paid_cents:10000,paid_date:null}],
    });
    expect(result).toMatchObject({expected:10000,paid:0,open:10000,pct:0});
  });

  it("rejeita competências anuais duplicadas", () => {
    expect(() => consolidateAnnualDashboard({
      year: 2026, currentMonth: 1, rows: [row("a", 2026)],
      cells: [cell("a", 1, 1000), cell("a", 1, 1000)], payments: [],
    })).toThrow(/duplicada/);
  });
});

describe("Consumo do mês selecionado — Despesas Anuais", () => {
  const rows = [
    { id: "caesb", creditor: "Caesb" },
    { id: "neo", creditor: "Neo Energia" },
    { id: "oi", creditor: "OI" },
  ];

  it("inclui CAESB, Neo Energia e Oi na competência de setembro, sem usar novembro", () => {
    const result = summarizeConsumptionForPeriod({
      rows,
      cells: [
        { annual_expense_id: "caesb", expected_cents: 10427 },
        { annual_expense_id: "neo", expected_cents: 23466 },
        { annual_expense_id: "oi", expected_cents: 8185 },
      ],
    });
    expect(result).toEqual({ total: 42078, missing: [], creditorCount: 3 });
  });

  it("não inventa valores de consumo variável sem lançamento em novembro", () => {
    const result = summarizeConsumptionForPeriod({
      rows,
      cells: [
        { annual_expense_id: "caesb", expected_cents: 0 },
        { annual_expense_id: "neo", expected_cents: 0 },
        { annual_expense_id: "oi", expected_cents: 7990 },
      ],
    });
    expect(result).toEqual({
      total: 7990, missing: ["Caesb", "Neo Energia"], creditorCount: 3,
    });
  });

  it("não soma lançamentos de outros credores e não duplica competência", () => {
    const data = { rows, cells: [
      { annual_expense_id: "caesb", expected_cents: 10000 },
      { annual_expense_id: "emprestimo", expected_cents: 999999 },
    ] };
    expect(summarizeConsumptionForPeriod(data)).toEqual({
      total: 10000, missing: ["Neo Energia", "OI"], creditorCount: 3,
    });
    expect(() => summarizeConsumptionForPeriod({
      rows, cells: [data.cells[0], data.cells[0]],
    })).toThrow(/duplicada/);
  });
});
