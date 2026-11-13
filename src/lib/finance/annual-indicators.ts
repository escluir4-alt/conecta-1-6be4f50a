/**
 * Consolidação exclusivamente das competências da tabela Despesas Anuais.
 * Valores são inteiros em centavos; pagamentos parciais nunca equivalem à quitação.
 */
export type IndicatorAnnualRow = {id:string;year:number};
export type IndicatorAnnualCell = {annual_expense_id:string;month:number;expected_cents:number|null};
export type IndicatorAnnualPayment = {source_annual_id:string|null;source_period:string|null;paid_cents:number|null;paid_date:string|null;is_settled:boolean|null;expected_cents?:number|null};

export function calculateAnnualIndicators(input:{
  rows:IndicatorAnnualRow[];
  cells:IndicatorAnnualCell[];
  payments:IndicatorAnnualPayment[];
  currentYear:number;
  scope:"current"|"all";
}) {
  const currentRows=input.rows.filter(r=>input.scope==="all"||r.year===input.currentYear);
  const rowYears=new Map(currentRows.map(r=>[r.id,r.year]));
  const years=[...new Set(currentRows.map(r=>r.year))].sort((a,b)=>a-b);
  const byPeriod=new Map<string,{paid:number;settled:boolean;explicitOpen:boolean}>();
  for(const p of input.payments){
    const y=p.source_annual_id?rowYears.get(p.source_annual_id):undefined;
    if(!y||!p.source_period||!p.paid_date||!p.source_period.startsWith(`${y}-`)) continue;
    const key=`${p.source_annual_id}:${p.source_period}`;
    const prev=byPeriod.get(key);
    const amount=Math.max(0,Math.round(Number(p.paid_cents)||0));
    byPeriod.set(key,{
      // Se houver espelhos do mesmo pagamento, nunca somar ambos.
      paid:Math.max(prev?.paid??0,amount),
      settled:Boolean(prev?.settled||p.is_settled===true),
      explicitOpen:Boolean(prev?.explicitOpen||p.is_settled===false),
    });
  }
  let expected=0,paid=0,covered=0;
  const seen=new Set<string>();
  for(const cell of input.cells){
    const y=rowYears.get(cell.annual_expense_id);
    if(y===undefined||!Number.isInteger(cell.month)||cell.month<1||cell.month>12) continue;
    const key=`${cell.annual_expense_id}:${y}-${String(cell.month).padStart(2,"0")}`;
    if(seen.has(key)) throw new Error(`Competência duplicada: ${key}`);
    seen.add(key);
    const value=Math.max(0,Math.round(Number(cell.expected_cents)||0));
    const p=byPeriod.get(key);
    const amount=p?.paid??0;
    const isCovered=p?.settled===true || (p?.explicitOpen!==true && amount>=value);
    expected+=value;
    paid+=amount;
    covered+=isCovered?value:Math.min(value,amount);
  }
  return {
    expected,paid,open:Math.max(0,expected-covered),
    expenseCount:currentRows.length,yearCount:years.length,
    firstYear:years[0]??null,lastYear:years.at(-1)??null,
  };
}
