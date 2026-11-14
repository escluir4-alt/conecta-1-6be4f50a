import { describe, expect, it } from "vitest";
import { calculateAnnualIndicators } from "@/lib/finance/annual-indicators";

const rows=[{id:"c6-2026",year:2026},{id:"c6-2027",year:2027},{id:"conta-2026",year:2026}];
const cells=[
  {annual_expense_id:"c6-2026",month:1,expected_cents:10001},
  {annual_expense_id:"c6-2027",month:1,expected_cents:20002},
  {annual_expense_id:"conta-2026",month:2,expected_cents:30003},
];
const payment=(id:string,period:string,paid:number,quits:boolean|null)=>({
  source_annual_id:id,source_period:period,paid_date:"2026-11-13",paid_cents:paid,is_settled:quits,
});
describe("Indicadores anuais por escopo",()=>{
  it("mantém ano vigente independente do exercício selecionado na grade",()=>{
    const result=calculateAnnualIndicators({rows,cells,currentYear:2026,scope:"current",
      payments:[payment("c6-2026","2026-01",9000,true)]});
    expect(result).toMatchObject({expected:40004,paid:9000,open:30003,expenseCount:2,yearCount:1});
  });
  it("agrega todos os exercícios, com dois anos do mesmo credor, sem cobrar duas vezes",()=>{
    const result=calculateAnnualIndicators({rows,cells,currentYear:2026,scope:"all",payments:[
      payment("c6-2026","2026-01",9000,true),
      payment("c6-2026","2026-01",9000,true),
      payment("c6-2027","2027-01",21000,true),
    ]});
    expect(result).toMatchObject({expected:60006,paid:30000,open:30003,expenseCount:3,yearCount:2,firstYear:2026,lastYear:2027});
  });
  it("contabiliza desconto, acréscimo e parcial sem quitação mantendo saldo pendente",()=>{
    const result=calculateAnnualIndicators({rows,cells,currentYear:2026,scope:"all",payments:[
      payment("c6-2026","2026-01",8500,true),
      payment("c6-2027","2027-01",23000,true),
      payment("conta-2026","2026-02",20000,false),
    ]});
    expect(result).toMatchObject({expected:60006,paid:51500,open:10003});
  });
  it("ignora pagamentos não confirmados e fontes sem vínculo anual",()=>{
    const result=calculateAnnualIndicators({rows,cells,currentYear:2026,scope:"current",payments:[
      {...payment("c6-2026","2026-01",9000,true),paid_date:null},
      payment("outro","2026-01",100000,true),
    ]});
    expect(result).toMatchObject({expected:40004,paid:0,open:40004});
  });
  it("não aceita competências duplicadas",()=>{
    expect(()=>calculateAnnualIndicators({rows,cells:[cells[0]!,cells[0]!],currentYear:2026,scope:"all",payments:[]})).toThrow(/duplicada/);
  });
});


describe("Dois resumos simultâneos — janela do ano vigente em diante",()=>{
  const extendedRows=[
    {id:"historic-25",year:2025},
    {id:"car-26",year:2026},
    {id:"car-27",year:2027},
    {id:"car-28",year:2028},
  ];
  const extendedCells=[
    {annual_expense_id:"historic-25",month:12,expected_cents:900000},
    {annual_expense_id:"car-26",month:1,expected_cents:20000},
    {annual_expense_id:"car-27",month:12,expected_cents:30000},
    {annual_expense_id:"car-28",month:6,expected_cents:40000},
  ];
  const payments=[
    payment("historic-25","2025-12",900000,true),
    payment("car-26","2026-01",10000,true),
    payment("car-26","2026-01",10000,true),
    payment("car-27","2027-12",10000,false),
  ];
  it("todos os anos: apenas 2026 até o último exercício, mesmo ao existir 2025",()=>{
    const total=calculateAnnualIndicators({
      rows:extendedRows,cells:extendedCells,payments,currentYear:2026,scope:"all",
    });
    expect(total).toMatchObject({
      expected:90000,paid:20000,open:60000,
      expenseCount:3,yearCount:3,firstYear:2026,lastYear:2028,
    });
  });
  it("ano vigente: janeiro a dezembro de 2026, independente da grade selecionada",()=>{
    const annual=calculateAnnualIndicators({
      rows:extendedRows,cells:extendedCells,payments,currentYear:2026,scope:"current",
    });
    expect(annual).toMatchObject({
      expected:20000,paid:10000,open:0,
      expenseCount:1,yearCount:1,firstYear:2026,lastYear:2026,
    });
  });
  it("virada do exercício muda ambos os resumos para 2027 e deixa o histórico intacto",()=>{
    const base={rows:extendedRows,cells:extendedCells,payments,currentYear:2027};
    const all=calculateAnnualIndicators({...base,scope:"all"});
    const current=calculateAnnualIndicators({...base,scope:"current"});
    expect(all).toMatchObject({expected:70000,paid:10000,open:60000,firstYear:2027,lastYear:2028});
    expect(current).toMatchObject({expected:30000,paid:10000,open:20000,firstYear:2027,lastYear:2027});
  });
  it("sem competência futura cadastrada, não projeta nem inventa valores",()=>{
    const all=calculateAnnualIndicators({
      rows:extendedRows,cells:extendedCells.slice(0,2),
      payments:[],currentYear:2026,scope:"all",
    });
    expect(all.expected).toBe(20000);
    expect(all.paid).toBe(0);
    expect(all.open).toBe(20000);
  });
});
