import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ChevronLeft, ChevronRight, Save, Landmark, CreditCard, RefreshCw } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { getStatement, type FinanceAccount } from "@/lib/pluggy.functions";

const MONTHS = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
const money=(value:number)=>value.toLocaleString("pt-BR",{style:"currency",currency:"BRL"});
const formatDay=(iso:string)=>iso.slice(8,10)+"/"+iso.slice(5,7)+"/"+iso.slice(0,4);

export function MovementHistoryDialog({open,initialAccount,accounts,labelFor,onClose}:{
 open:boolean;initialAccount:string|null;accounts:FinanceAccount[];labelFor:(a:FinanceAccount)=>string;onClose:()=>void;
}) {
 const [selected,setSelected]=useState<string|null>(null);
 const [period,setPeriod]=useState(new Date().toISOString().slice(0,7));
 const account=accounts.find(a=>a.id===selected)??accounts.find(a=>a.id===initialAccount)??accounts[0];
 const [year,month]=period.split("-").map(Number);
 const fetcher=useServerFn(getStatement);
 useEffect(()=>{if(open){setSelected(initialAccount);setPeriod(new Date().toISOString().slice(0,7));}},[open,initialAccount]);
 const query=useQuery({queryKey:["statement",account?.id,period],queryFn:()=>fetcher({data:{accountId:account!.id,month:period}}),enabled:open&&!!account});
 const txs=query.data?.transactions??[];
 const byDate=new Map<string,typeof txs>();
 for(const transaction of txs) {
   const date=transaction.date.slice(0,10);
   const list=byDate.get(date)??[];
   list.push(transaction);
   byDate.set(date,list);
 }
 const months=Array.from(byDate.entries()).sort((a,b)=>b[0].localeCompare(a[0]));
 const changeMonth=(offset:number)=>{
   const d=new Date(Date.UTC(year!,month!-1+offset,1));
   if(d.getFullYear()>=2000&&d.getFullYear()<=new Date().getFullYear())
     setPeriod(`${d.getUTCFullYear()}-${String(d.getUTCMonth()+1).padStart(2,"0")}`);
 };
 return <Dialog open={open} onOpenChange={v=>!v&&onClose()}>
  <DialogContent className="max-h-[88vh] max-w-3xl overflow-y-auto rounded-3xl border-border/60">
   <DialogHeader>
    <DialogTitle className="flex items-center gap-2 font-serif text-xl"><Save className="size-4 text-primary"/>Histórico de movimentações</DialogTitle>
    <DialogDescription>Contas e cartões · transações organizadas em linha do tempo, sem parcelas. Cada período consultado é preservado no histórico do Axion quando a base está disponível.</DialogDescription>
   </DialogHeader>
   <div className="flex gap-2 overflow-x-auto pb-2" aria-label="Contas e cartões">
    {accounts.map(a=><button key={a.id} type="button" onClick={()=>setSelected(a.id)} aria-pressed={account?.id===a.id}
      className={`flex min-w-[128px] max-w-[190px] flex-none items-center gap-2 rounded-xl border px-3 py-2 text-left text-xs transition ${account?.id===a.id?"border-primary bg-primary/10":"border-border/60 hover:bg-muted"}`}>
      {a.type==="CREDIT"?<CreditCard className="size-4 shrink-0"/>:<Landmark className="size-4 shrink-0"/>}
      <span className="min-w-0"><span className="block truncate font-semibold">{labelFor(a)}</span><span className="block text-[10px] text-muted-foreground">•••• {a.number||"—"}</span></span>
     </button>)}
   </div>
   <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-muted/40 p-2">
    <Button variant="ghost" size="icon" onClick={()=>changeMonth(-1)} aria-label="Mês anterior"><ChevronLeft className="size-4"/></Button>
    <div className="flex min-w-0 flex-1 items-center justify-center gap-2">
     <span className="font-semibold">{MONTHS[(month??1)-1]}</span>
     <select aria-label="Ano do histórico" className="rounded-lg border bg-card px-2 py-1.5 text-sm"
      value={year} onChange={e=>setPeriod(`${e.target.value}-${String(month).padStart(2,"0")}`)}>
      {Array.from({length:12},(_,i)=>new Date().getFullYear()-i).map(y=><option key={y} value={y}>{y}</option>)}
     </select>
    </div>
    <Button variant="ghost" size="icon" disabled={period>=new Date().toISOString().slice(0,7)} onClick={()=>changeMonth(1)} aria-label="Mês seguinte"><ChevronRight className="size-4"/></Button>
   </div>
   <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
    <span>{account?labelFor(account):"Selecione uma conta"} · {txs.length} movimentações</span>
    <Button size="sm" variant="ghost" disabled={!account||query.isFetching} onClick={()=>void query.refetch()} aria-label="Atualizar e salvar movimentações"><RefreshCw className="size-3.5"/>Atualizar</Button>
   </div>
   {query.data?.source==="saved"&&<p className="text-xs text-amber-700 dark:text-amber-300">Exibindo dados anteriormente salvos porque a instituição não respondeu.</p>}
   {query.data&&!query.data.historyAvailable&&<p className="text-xs text-amber-700 dark:text-amber-300">O banco de histórico ainda não está configurado. A consulta funciona, mas não pode ser salva.</p>}
   {query.error&&<p role="alert" className="rounded-xl border border-destructive/30 p-3 text-sm text-destructive">{(query.error as Error).message}</p>}
   {query.isLoading&&<p className="py-8 text-center text-sm text-muted-foreground">Consultando movimentações da Pluggy…</p>}
   {!query.isLoading&&!query.error&&!txs.length&&<p className="py-8 text-center text-sm text-muted-foreground">Nenhuma movimentação não parcelada para esta competência.</p>}
   <div className="max-h-[48vh] overflow-y-auto pr-1">
    {months.map(([day,items])=><section key={day} className="relative border-l border-border/70 pb-4 pl-5">
      <span className="absolute -left-[5px] top-1 size-2.5 rounded-full bg-primary"/>
      <h4 className="mb-2 text-xs font-bold text-muted-foreground">{formatDay(day)}</h4>
      <div className="divide-y divide-border/40 rounded-xl border border-border/50 bg-card">
        {items.map(item=><div key={item.id} className="flex items-start justify-between gap-3 p-3 text-sm">
         <div className="min-w-0"><div className="font-medium">{item.description}</div><div className="mt-1 text-xs text-muted-foreground">{item.category}</div></div>
         <span className={`shrink-0 font-bold ${item.amount>=0?"text-success":"text-foreground"}`}>{money(item.amount)}</span>
        </div>)}
      </div>
     </section>)}
   </div>
  </DialogContent>
 </Dialog>;
}
