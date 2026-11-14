/**
 * Consolidação exclusivamente das competências da tabela Despesas Anuais.
 * Valores são inteiros em centavos; pagamentos parciais nunca equivalem à quitação.
 */
export type IndicatorAnnualRow = {id:string;year:number};
export type IndicatorAnnualCell = {annual_expense_id:string;month:number;expected_cents:number|null};
export type IndicatorAnnualPayment = {source_annual_id:string|null;source_period:string|null;paid_cents:number|null;paid_date:string|null;is_settled:boolean|null;expected_cents?:number|null};
export type IndicatorTrendPoint = {period:number;expected:number;paid:number;open:number};


export function calculateAnnualIndicators(input:{
  rows:IndicatorAnnualRow[];
  cells:IndicatorAnnualCell[];
  payments:IndicatorAnnualPayment[];
  currentYear:number;
  scope:"current"|"all";
}) {
  // "Todos os anos" começa no ano vigente: históricos anteriores não fazem parte
  // dos compromissos apurados do presente até o último exercício cadastrado.
  const currentRows=input.rows.filter(r=>r.year>=input.currentYear &&
    (input.scope==="all" || r.year===input.currentYear));
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
  // Posições reais: 1–12 para o ano vigente; ano civil para o consolidado.
  // Meses/anos sem células lançadas não se transformam em previsão ou valor fictício.
  const trendBuckets=new Map<number,{expected:number;paid:number;covered:number}>();
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
    const credited=isCovered?value:Math.min(value,amount);
    expected+=value;
    paid+=amount;
    covered+=credited;
    if(cell.expected_cents!=null || amount>0){
      const period=input.scope==="current"?cell.month:y;
      const bucket=trendBuckets.get(period)??{expected:0,paid:0,covered:0};
      bucket.expected+=value;
      bucket.paid+=amount;
      bucket.covered+=credited;
      trendBuckets.set(period,bucket);
    }
  }
  const trend:IndicatorTrendPoint[]=[...trendBuckets.entries()]
    .sort(([a],[b])=>a-b)
    .map(([period,v])=>({
      period,expected:v.expected,paid:v.paid,open:Math.max(0,v.expected-v.covered),
    }));
  return {
    expected,paid,open:Math.max(0,expected-covered),
    expenseCount:currentRows.length,yearCount:years.length,
    firstYear:years[0]??null,lastYear:years.at(-1)??null,
    trend,
  };
}
