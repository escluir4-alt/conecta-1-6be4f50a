export type InstallmentTx = {id:string;description:string;date:string;amount:number;type:"DEBIT"|"CREDIT";
creditCardMetadata?:{installmentNumber?:number|null;totalInstallments?:number|null}|null;
installmentNumber?:number|null;totalInstallments?:number|null};
export type ForecastMonth={year:number;month:number;expected_cents:number;installments:number};
const valid=(n:unknown):n is number=>typeof n==="number"&&Number.isInteger(n)&&n>0;
/** Conservador: somente metadados estruturados, sem inferir faturas ou compras não realizadas. */
export function projectCardInstallments(txs:InstallmentTx[],fromYear:number,maxYear=fromYear+10):ForecastMonth[]{
  const latest=new Map<string,InstallmentTx>();
  for(const tx of txs){
    const n=tx.creditCardMetadata?.installmentNumber??tx.installmentNumber;
    const total=tx.creditCardMetadata?.totalInstallments??tx.totalInstallments;
    if(!valid(n)||!valid(total)||total<=n||total>120||tx.type!=="DEBIT"||
      !Number.isFinite(tx.amount)||tx.amount===0||!/^\d{4}-\d{2}-\d{2}$/.test(tx.date))continue;
    const cents=Math.round(Math.abs(tx.amount)*100);
    const name=tx.description.trim().toLowerCase().replace(/\b\d{1,3}\s*\/\s*\d{1,3}\b/g,"").replace(/\s+/g," ");
    const key=`${name}:${cents}:${total}`;
    const old=latest.get(key);
    const oldN=old?.creditCardMetadata?.installmentNumber??old?.installmentNumber??0;
    if(!old||n>oldN||(n===oldN&&tx.date>old.date))latest.set(key,tx);
  }
  const sums=new Map<string,ForecastMonth>();
  for(const tx of latest.values()){
    const n=tx.creditCardMetadata?.installmentNumber??tx.installmentNumber;
    const total=tx.creditCardMetadata?.totalInstallments??tx.totalInstallments;
    if(!valid(n)||!valid(total))continue;
    const [year0,month0]=tx.date.split("-").map(Number);
    if(!year0||!month0||month0<1||month0>12)continue;
    for(let step=1;step<=total-n;step++){
      const offset=month0-1+step,year=year0+Math.floor(offset/12),month=offset%12+1;
      if(year<fromYear||year>maxYear)continue;
      const key=`${year}-${month}`,old=sums.get(key);
      sums.set(key,{year,month,expected_cents:(old?.expected_cents??0)+Math.round(Math.abs(tx.amount)*100),installments:(old?.installments??0)+1});
    }
  }
  return [...sums.values()].sort((a,b)=>a.year-b.year||a.month-b.month);
}
