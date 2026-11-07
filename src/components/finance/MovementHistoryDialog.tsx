import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ChevronLeft, ChevronRight, RefreshCw, Save } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { getConsolidatedMonth } from "@/lib/pluggy.functions";

const MONTHS = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
const money = (value:number) => Math.abs(value).toLocaleString("pt-BR", { style:"currency", currency:"BRL" });
function changePeriod(year:number, month:number, delta:number) {
 const next = new Date(Date.UTC(year, month-1+delta, 1));
 return `${next.getUTCFullYear()}-${String(next.getUTCMonth()+1).padStart(2,"0")}`;
}
export function MovementHistoryDialog({open,onClose}: {open:boolean;onClose:()=>void}) {
 const current = new Date().toISOString().slice(0,7);
 const [period,setPeriod] = useState(current);
 const [year,month] = period.split("-").map(Number);
 const client = useQueryClient();
 const fetcher = useServerFn(getConsolidatedMonth);
 const query = useQuery({
  queryKey:["consolidated-movements",period],
  queryFn:()=>fetcher({data:{period}}),
  enabled:open,
  staleTime:1000*60*3,
 });
 const {transactions=[],errors=[],savedAccounts=0,unsavedAccounts=0,staleAccounts=0} = query.data??{};
 const days = useMemo(()=>{
  const end = new Date(Date.UTC(year!,month!,0)).getUTCDate();
  const grouped = new Map<string,typeof transactions>();
  for(const tx of transactions){
   const key=tx.date.slice(0,10);
   const list=grouped.get(key)??[];
   list.push(tx);
   grouped.set(key,list);
  }
  return Array.from({length:end},(_,index)=>{
   const day=index+1;
   const key=`${period}-${String(day).padStart(2,"0")}`;
   return {day,key,entries:grouped.get(key)??[]};
  });
 },[transactions,period,year,month]);
 const move = (step:number)=>{
  const next=changePeriod(year!,month!,step);
  if(next<=current && next>="2000-01")setPeriod(next);
 };
 const refetch = async()=>{
  await client.invalidateQueries({queryKey:["consolidated-movements",period]});
 };
 return <Dialog open={open} onOpenChange={value=>!value&&onClose()}>
  <DialogContent className="flex max-h-[90vh] max-w-4xl flex-col overflow-hidden rounded-[26px] border-border/60 p-4 sm:p-6">
   <DialogHeader>
    <DialogTitle className="flex items-center gap-2 font-serif text-xl"><Save className="size-4 text-muted-foreground"/>Histórico de movimentações</DialogTitle>
    <DialogDescription>Extrato consolidado de todas as contas e cartões, sem parcelas. Movimentos organizados do dia 01 ao último dia do mês.</DialogDescription>
   </DialogHeader>
   <div className="flex flex-wrap items-center justify-between gap-2">
    <div className="flex items-center gap-1">
     <Button variant="ghost" size="icon" aria-label="Mês anterior" onClick={()=>move(-1)}><ChevronLeft className="size-4"/></Button>
     <span className="min-w-[56px] text-center text-sm font-semibold">{MONTHS[(month??1)-1]}</span>
     <Button variant="ghost" size="icon" aria-label="Mês seguinte" disabled={period>=current} onClick={()=>move(1)}><ChevronRight className="size-4"/></Button>
    </div>
    <label className="flex items-center gap-2 text-xs font-medium">Ano
     <select value={year} aria-label="Ano do histórico" className="rounded-lg border bg-card px-2 py-1.5 text-sm"
      onChange={e=>setPeriod(`${e.target.value}-${String(month).padStart(2,"0")}`)}>
      {Array.from({length:15},(_,i)=>new Date().getFullYear()-i).map(y=><option key={y} value={y}>{y}</option>)}
     </select>
    </label>
   </div>
   <div aria-label="Carrossel de meses" className="flex shrink-0 gap-1 overflow-x-auto pb-2">
    {MONTHS.map((label,index)=>{
     const target=`${year}-${String(index+1).padStart(2,"0")}`;
     return <button type="button" key={label} disabled={target>current} aria-pressed={month===index+1}
      className={`min-w-12 rounded-xl px-3 py-2 text-xs font-semibold transition disabled:opacity-35 ${month===index+1?"bg-primary text-primary-foreground":"border border-border/60 bg-card hover:bg-muted"}`}
      onClick={()=>setPeriod(target)}>{label}</button>;
    })}
   </div>
   <div className="flex shrink-0 items-center justify-between gap-2 text-xs text-muted-foreground">
    <span>{query.isLoading?"Consultando Pluggy…":`${transactions.length} movimentações · ${period}`}</span>
    <Button variant="ghost" size="sm" disabled={query.isFetching} onClick={()=>void refetch()} aria-label="Atualizar extratos"><RefreshCw className="size-3.5"/>Atualizar</Button>
   </div>
   {!!staleAccounts&&<p role="status" className="text-xs text-amber-700 dark:text-amber-300">{staleAccounts} conta(s) exibem dados salvos anteriormente.</p>}
   {!!unsavedAccounts&&<p role="status" className="text-xs text-amber-700 dark:text-amber-300">Histórico de {unsavedAccounts} conta(s) não pôde ser salvo. Confira a migração do Supabase.</p>}
   {savedAccounts>0&&<p className="text-xs text-muted-foreground">Histórico atualizado e salvo para {savedAccounts} conta(s).</p>}
   {errors.length>0&&<div role="alert" className="max-h-20 overflow-y-auto rounded-xl border border-amber-300/40 bg-amber-50/40 px-3 py-2 text-xs text-amber-800 dark:text-amber-300">{errors.map((error,i)=><p key={i}>{error}</p>)}</div>}
   {query.error&&<p role="alert" className="rounded-xl border border-destructive/30 p-3 text-sm text-destructive">{(query.error as Error).message}</p>}
   <div className="min-h-0 flex-1 overflow-y-auto pr-1">
    {!query.isLoading&&!query.error&&transactions.length===0&&<p className="py-4 text-center text-sm text-muted-foreground">Nenhuma movimentação disponível nesta competência.</p>}
    {days.map(({day,key,entries})=><section key={key} className="relative border-l border-border/60 pb-4 pl-5">
     <span className={`absolute -left-[5px] top-1 size-2.5 rounded-full ${entries.length?"bg-primary":"bg-border"}`}/>
     <div className="mb-2 flex items-center gap-2">
      <h4 className="text-xs font-bold text-muted-foreground">Dia {String(day).padStart(2,"0")}</h4>
      <span className="text-[11px] text-muted-foreground">{entries.length} movimentação(ões)</span>
     </div>
     {entries.length>0&&<div className="divide-y divide-border/40 rounded-xl border border-border/50 bg-card">
      {entries.map(tx=><div key={tx.connectionSlot+":"+tx.accountId+":"+tx.id} className="flex items-start justify-between gap-3 p-3 text-sm">
       <div className="min-w-0">
        <div className="break-words font-semibold">{tx.description}</div>
        <div className="mt-1 text-xs text-muted-foreground">{tx.institution} · {tx.accountName}{tx.lastFour?" •••• "+tx.lastFour:""} · {tx.accountType==="CREDIT"?"Cartão "+(tx.brand||""):"Conta"}</div>
        <div className="text-[11px] text-muted-foreground">{tx.date.slice(11,16)||tx.date.slice(8,10)+"/"+tx.date.slice(5,7)} · {tx.category}</div>
       </div>
       <div className="shrink-0 text-right">
        <div className={`font-bold ${tx.amount>=0?"text-blue-600 dark:text-blue-400":"text-red-600 dark:text-red-400"}`}>{tx.amount>=0?"+ ":"− "}{money(tx.amount)}</div>
        <div className={`mt-1 text-[10px] font-medium ${tx.amount>=0?"text-blue-600 dark:text-blue-400":"text-red-600 dark:text-red-400"}`}>{tx.amount>=0?"Crédito":"Despesa"}</div>
       </div>
      </div>)}
     </div>}
    </section>)}
   </div>
  </DialogContent>
 </Dialog>;
}
