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


describe("Gráficos dos indicadores — apenas dados persistidos",()=>{
  const yearRows=[
    {id:"historico",year:2025},
    {id:"contrato-26",year:2026},
    {id:"consumo-26",year:2026},
    {id:"contrato-27",year:2027},
  ];
  const monthCells=[
    {annual_expense_id:"historico",month:1,expected_cents:500000},
    {annual_expense_id:"contrato-26",month:12,expected_cents:10000},
    {annual_expense_id:"contrato-26",month:1,expected_cents:20000},
    {annual_expense_id:"consumo-26",month:1,expected_cents:5000},
    {annual_expense_id:"contrato-27",month:3,expected_cents:30000},
  ];
  const actualPayments=[
    payment("historico","2025-01",500000,true),
    payment("contrato-26","2026-01",18000,true),
    payment("contrato-26","2026-01",18000,true),
    payment("consumo-26","2026-01",3000,false),
    payment("contrato-27","2027-03",30000,true),
  ];
  it("série anual mostra só 2026 e 2027 e deduplica pagamentos",()=>{
    const result=calculateAnnualIndicators({
      rows:yearRows,cells:monthCells,payments:actualPayments,currentYear:2026,scope:"all"
    });
    expect(result.trend).toEqual([
      {period:2026,expected:35000,paid:21000,open:12000},
      {period:2027,expected:30000,paid:30000,open:0},
    ]);
    expect(result).toMatchObject({expected:65000,paid:51000,open:12000});
    expect(result.trend.reduce((sum,point)=>sum+point.expected,0)).toBe(result.expected);
    expect(result.trend.reduce((sum,point)=>sum+point.paid,0)).toBe(result.paid);
    expect(result.trend.reduce((sum,point)=>sum+point.open,0)).toBe(result.open);
  });
  it("série mensal ignora futuro e mês sem lançamentos, mas preserva mês 12",()=>{
    const result=calculateAnnualIndicators({
      rows:yearRows,cells:monthCells,payments:actualPayments,currentYear:2026,scope:"current"
    });
    expect(result.trend).toEqual([
      {period:1,expected:25000,paid:21000,open:2000},
      {period:12,expected:10000,paid:0,open:10000},
    ]);
  });
  it("retorna série vazia sem valores registrados e não cria projeções",()=>{
    const result=calculateAnnualIndicators({
      rows:[{id:"sem-lancamentos",year:2026}],
      cells:[{annual_expense_id:"sem-lancamentos",month:2,expected_cents:null}],
      payments:[],currentYear:2026,scope:"all",
    });
    expect(result).toMatchObject({expected:0,paid:0,open:0,trend:[]});
  });
  it("com um único período registrado, mantém apenas um ponto real",()=>{
    const result=calculateAnnualIndicators({
      rows:[{id:"unico",year:2028}],
      cells:[{annual_expense_id:"unico",month:9,expected_cents:4900}],
      payments:[],currentYear:2026,scope:"all",
    });
    expect(result.trend).toEqual([{period:2028,expected:4900,paid:0,open:4900}]);
  });
});
