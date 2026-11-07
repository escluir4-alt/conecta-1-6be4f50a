import { useState } from "react";
import { ChevronLeft, ChevronRight, CreditCard, Pencil, Radio } from "lucide-react";
import type { FinanceAccount } from "@/lib/pluggy.functions";

const money = (n: number) => n.toLocaleString("pt-BR",{style:"currency",currency:"BRL"});
const safe = (n: number | null | undefined) => n == null || !Number.isFinite(n) ? "Não informado" : money(n);
const compact = (date: string | null | undefined) => date ? date.slice(8,10)+"/"+date.slice(5,7) : "Não informado";

type CardStyle = { gradient: string; light: boolean; brandName: string; accent?: string };
export function getCardDesign(account: FinanceAccount): CardStyle {
  const text = (account.institution+" "+account.name).normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();
  if (/nubank|\bnu\b/.test(text)) return {gradient:"linear-gradient(125deg,#631278,#ce39e2 70%,#8c16a5)",light:false,brandName:"nu"};
  if (/casas bahia|bradescard/.test(text)) return {gradient:"linear-gradient(180deg,#fff 0%,#f8f9ff 71%,#2040c8 71%,#1941bb 100%)",light:true,brandName:"CASAS BAHIA"};
  if (/caixa|sim visa/.test(text)) return {gradient:"linear-gradient(140deg,#1969a2 0%,#259cca 56%,#2170a4 56%,#2367a4 100%)",light:false,brandName:"Sim",accent:"#f99428"};
  if (/btg/.test(text)) return {gradient:"linear-gradient(135deg,#4e6073,#364556)",light:false,brandName:"btg pactual"};
  if (/c6/.test(text)) return {gradient:"linear-gradient(120deg,#d9d3c8,#646e6a 80%)",light:false,brandName:"C6 BANK"};
  if (/neon/.test(text)) return {gradient:"linear-gradient(120deg,#21c6e5,#09abc7 85%)",light:false,brandName:"neon"};
  if (/inter/.test(text)) return {gradient:"linear-gradient(135deg,#f78c21,#fdba4b)",light:false,brandName:"inter"};
  return {gradient:"linear-gradient(135deg,#285f70,#16434f)",light:false,brandName:account.institution};
}
export function CardBrand({brand}:{brand:string}) {
 const b=brand.toUpperCase();
 if (b.includes("MASTER")) return <span className="relative inline-flex h-8 w-14 shrink-0 items-center" aria-label="Mastercard"><span className="absolute left-1 h-8 w-8 rounded-full bg-[#eb001b]"/><span className="absolute right-1 h-8 w-8 rounded-full bg-[#f9a21a]/95"/></span>;
 if (b.includes("VISA")) return <span className="text-xl font-black italic tracking-[-.07em]">VISA</span>;
 if (b.includes("ELO")) return <span className="text-xl font-extrabold tracking-tight">elo</span>;
 if (!b) return <span className="text-[10px] font-medium opacity-70">Bandeira não informada</span>;
 return <span className="text-sm font-bold">{b}</span>;
}
export function CardFace({account,name,brand,expanded=false}:{account:FinanceAccount;name:string;brand:string;expanded?:boolean}) {
 const design=getCardDesign(account);
 const used=Math.max(0, account.creditLimit-account.available);
 return <div className={`relative isolate w-full overflow-hidden rounded-[24px] border border-white/15 p-5 text-left shadow-lg transition-all duration-300 ${design.light?"text-slate-900":"text-white"} ${expanded?"min-h-[218px]":"min-h-[175px]"}`} style={{background:design.gradient}}>
   <div className="pointer-events-none absolute -right-10 -top-16 h-52 w-52 rounded-full border border-white/15"/>
   <div className="pointer-events-none absolute -bottom-28 -left-8 h-52 w-52 rounded-full bg-white/[.07] blur-xl"/>
   <div className="relative flex items-start justify-between gap-3">
    <div><div className="text-[10px] font-semibold uppercase tracking-[.2em] opacity-75">{account.institution}</div><div className="mt-1 truncate text-xl font-semibold tracking-tight">{design.brandName}</div></div>
    <CardBrand brand={brand}/>
   </div>
   <div className="relative mt-5 flex items-center gap-2"><div className="h-7 w-10 rounded-md border border-slate-400/60 bg-gradient-to-br from-slate-100 via-[#bcc4c3] to-slate-400 shadow-inner"><div className="mx-auto h-full w-px bg-slate-500/40"/></div><Radio className="size-5 rotate-90 opacity-70"/></div>
   <div className="relative mt-4 flex items-end justify-between gap-3">
    <div className="min-w-0"><div className="truncate text-sm font-semibold">{name}</div><div className="mt-1 text-xs opacity-85">•••• {account.number||"••••"}</div></div>
    {expanded && <div className="shrink-0 text-right text-[11px] leading-5"><div>Vence {compact(account.dueDate)}</div><div>Usado {safe(used)}</div></div>}
   </div>
 </div>;
}
export function CardWallet({cards,displayName,displayBrand,onEdit,onOpen}:{
 cards:FinanceAccount[];displayName:(a:FinanceAccount)=>string;displayBrand:(a:FinanceAccount)=>string;
 onEdit:(a:FinanceAccount)=>void;onOpen:(a:FinanceAccount)=>void;
}) {
 const [selected,setSelected]=useState<string|null>(null);
 const chosen=cards.find(c=>c.id===selected)??cards[0];
 const currentIndex=cards.findIndex(c=>c.id===chosen?.id);
 const move=(delta:number)=>setSelected(cards[(currentIndex+delta+cards.length)%cards.length]!.id);
 if (!cards.length) return <div className="py-10 text-center text-sm text-muted-foreground">Nenhum cartão conectado.</div>;
 const card=chosen!;
 const used=Math.max(0,card.creditLimit-card.available);
 return <div className="space-y-3">
  <p className="text-xs text-muted-foreground">Selecione um cartão para destacá-lo. Clique duas vezes para abrir sua fatura.</p>
  <div className="relative flex items-center gap-2">
   <button className="grid size-8 shrink-0 place-items-center rounded-full border bg-background hover:bg-muted disabled:opacity-40" disabled={cards.length<2} onClick={()=>move(-1)} aria-label="Cartão anterior"><ChevronLeft className="size-4"/></button>
   <div className="min-w-0 flex-1">
    <button type="button" className="block w-full translate-y-[-4px] rounded-3xl outline-none transition-transform hover:-translate-y-2 focus-visible:ring-2 focus-visible:ring-primary" onDoubleClick={()=>onOpen(card)} onClick={()=>setSelected(card.id)} aria-label={`Cartão ${displayName(card)}; clique duas vezes para abrir a fatura`}>
     <CardFace account={card} name={displayName(card)} brand={displayBrand(card)} expanded />
    </button>
   </div>
   <button className="grid size-8 shrink-0 place-items-center rounded-full border bg-background hover:bg-muted disabled:opacity-40" disabled={cards.length<2} onClick={()=>move(1)} aria-label="Próximo cartão"><ChevronRight className="size-4"/></button>
  </div>
  <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-3">
   <Info label="Limite total" value={safe(card.creditLimit)}/>
   <Info label="Disponível" value={safe(card.available)}/>
   <Info label="Utilizado" value={safe(used)}/>
   <Info label="Fechamento" value={compact(card.closingDate)}/>
   <Info label="Vencimento" value={compact(card.dueDate)}/>
   <Info label="Final" value={"•••• "+(card.number||"—")}/>
  </div>
  <div className="flex gap-2">
   <button className="flex flex-1 items-center justify-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold hover:bg-muted" onClick={()=>onEdit(card)}><Pencil className="size-3.5"/>Personalizar</button>
   <button className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground hover:opacity-90" onClick={()=>onOpen(card)}><CreditCard className="size-3.5"/>Ver fatura</button>
  </div>
  {cards.length>1&&<div className="flex gap-2 overflow-x-auto pb-2">
   {cards.map(c=><button key={c.id} type="button" onClick={()=>setSelected(c.id)} onDoubleClick={()=>onOpen(c)} aria-pressed={c.id===chosen?.id} className={`min-w-[112px] max-w-[145px] flex-1 rounded-2xl border p-2 text-left transition-all ${c.id===chosen?.id?"border-primary bg-primary/5 shadow-sm":"border-border/50 hover:bg-muted/60"}`}>
    <div className="h-11 rounded-lg border border-white/20 p-2" style={{background:getCardDesign(c).gradient}}><div className="h-3 w-5 rounded-sm bg-white/60"/></div>
    <div className="mt-1 truncate text-[11px] font-semibold">{displayName(c)}</div>
    <div className="text-[10px] text-muted-foreground">•••• {c.number||"—"}</div>
   </button>)}
  </div>}
 </div>;
}
export function Info({label,value}:{label:string;value:string}) {
 return <div className="rounded-xl border border-border/50 bg-muted/30 p-2.5"><div className="text-[11px] text-muted-foreground">{label}</div><div className="mt-1 break-words text-sm font-semibold">{value}</div></div>;
}
