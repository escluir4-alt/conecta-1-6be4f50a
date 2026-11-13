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
