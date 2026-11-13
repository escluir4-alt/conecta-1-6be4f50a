import { describe, expect, it } from "vitest";
import { consolidateAnnualDashboard, consolidateOpenCommitments, summarizeConsumptionForPeriod } from "@/lib/finance/annual-dashboard";

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
      rows, cells: [data.cells[0]!, data.cells[0]!],
    })).toThrow(/duplicada/);
  });
});

describe("Índices de compromissos ativos — todos os anos", () => {
  const rows = [
    {id:"a26",year:2026,creditor:"Empréstimo A",source_contract_id:"contract-a",expense_kind:"debt" as const},
    {id:"a27",year:2027,creditor:"Empréstimo A",source_contract_id:"contract-a",expense_kind:"debt" as const},
    {id:"b26",year:2026,creditor:"Contrato B",source_contract_id:"contract-b",expense_kind:"debt" as const},
    {id:"c26",year:2026,creditor:"Contrato C",source_contract_id:"contract-c",expense_kind:"debt" as const},
    {id:"d26",year:2026,creditor:"CAESB",expense_kind:"consumption" as const},
    {id:"old",year:2025,creditor:"Empréstimo A",source_contract_id:"contract-a",expense_kind:"debt" as const},
  ];
  const cells = [
    cell("a26",11,10000),cell("a27",1,20000),
    cell("b26",11,10000),cell("c26",11,9000),
    cell("d26",11,3000),cell("old",11,100000),
  ];
  const payments = [
    payment("a26","2026-11",5000),payment("b26","2026-11",10000),
    payment("c26","2026-11",1000),payment("old","2025-11",100000),
  ];
  it("soma 2026 e 2027, exclui quitado, consumo e exercício anterior", () => {
    const result=consolidateOpenCommitments({currentYear:2026,rows,cells,payments});
    expect(result).toMatchObject({expected:39000,paid:6000,open:33000,active:2,pct:15});
    expect(result.yearly.map(x=>x.year)).toEqual([2026,2027]);
  });
  it("não inclui contratos arquivados nem anos arquivados", () => {
    const result=consolidateOpenCommitments({
      currentYear:2026,rows,cells,payments,
      archivedContracts:["contract-c"],archivedYears:[2027],
    });
    expect(result).toMatchObject({expected:10000,paid:5000,open:5000,active:1});
  });
  it("zera TODOS os índices quando só restam obrigações quitadas", () => {
    const result=consolidateOpenCommitments({
      currentYear:2026,rows:[rows[2]!],cells:[cells[2]!],payments:[payments[1]!],
    });
    expect(result).toMatchObject({expected:0,paid:0,open:0,pct:0,active:0,yearly:[]});
  });
});


describe("Descontos e quitação nos painéis anuais", () => {
  const debtRow = { id: "c6", year: 2026, creditor: "Empréstimo C6 Bank", expense_kind: "debt" as const };
  const debtCell = { annual_expense_id: "c6", month: 11, expected_cents: 136068 };
  const bill = { source_annual_id: "c6", source_period: "2026-11", paid_cents: 135883, paid_date: "2026-11-11" };

  it("baixa com desconto confirmado mantém dinheiro pago real e saldo zero", () => {
    const result = consolidateAnnualDashboard({
      year: 2026, currentMonth: 11, rows: [debtRow], cells: [debtCell],
      payments: [{ ...bill, is_settled: true }],
    });
    expect(result).toMatchObject({ expected: 136068, paid: 135883, open: 0, pct: 100 });
  });

  it("sem Quita preserva o desconto aparente como R$ 1,85 em aberto", () => {
    const result = consolidateAnnualDashboard({
      year: 2026, currentMonth: 11, rows: [debtRow], cells: [debtCell],
      payments: [{ ...bill, is_settled: false }],
    });
    expect(result).toMatchObject({ expected: 136068, paid: 135883, open: 185 });
    expect(result.pct).toBeLessThan(100);
  });

  it("parcela quitada com desconto é excluída de compromissos ativos", () => {
    const result = consolidateOpenCommitments({
      currentYear: 2026, rows: [debtRow], cells: [debtCell],
      payments: [{ ...bill, is_settled: true }],
    });
    expect(result).toMatchObject({ expected: 0, paid: 0, open: 0, active: 0 });
  });

  it("parcela sem quitação expressa ainda é uma obrigação ativa", () => {
    const result = consolidateOpenCommitments({
      currentYear: 2026, rows: [debtRow], cells: [debtCell],
      payments: [{ ...bill, is_settled: false }],
    });
    expect(result).toMatchObject({ expected: 136068, paid: 135883, open: 185, active: 1 });
  });
});
