import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Download, FileText } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CardFace, Info } from "@/components/finance/CardWallet";
import { getStatement, type FinanceAccount } from "@/lib/pluggy.functions";

const MONTHS = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
const money=(n:number)=>n.toLocaleString("pt-BR",{style:"currency",currency:"BRL"});
const safe=(n:number|null|undefined)=>n==null?"Não informado":money(n);
const date=(d:string|null|undefined)=>d?d.slice(8,10)+"/"+d.slice(5,7)+"/"+d.slice(0,4):"Não informado";

export function CardStatementDialog({acc,name,brand,onClose}:{acc:FinanceAccount|null;name:string;brand:string;onClose:()=>void}) {
 const today=new Date();
 const [year,setYear]=useState(today.getFullYear());
 const [month,setMonth]=useState(today.getMonth()+1);
 useEffect(()=>{setYear(new Date().getFullYear());setMonth(new Date().getMonth()+1);},[acc?.id]);
 const period=`${year}-${String(month).padStart(2,"0")}`;
 const fn=useServerFn(getStatement);
 const q=useQuery({queryKey:["statement",acc?.id,period],queryFn:()=>fn({data:{accountId:acc!.id,month:period}}),enabled:!!acc});
 const statement=q.data;
 const transactions=statement?.transactions??[];
 const isCredit=acc?.type==="CREDIT";
 const current=period===today.toISOString().slice(0,7);
 const limits=statement?.limits??(current&&acc?{total:acc.creditLimit,available:acc.available,used:Math.max(0,acc.creditLimit-acc.available)}:null);
 const invoice=statement?.invoice;
 const closing=invoice?.closingDate??(current?acc?.closingDate:null);
 const due=invoice?.dueDate??(current?acc?.dueDate:null);
 const canDownload=!!statement&&!q.isLoading&&(transactions.length>0||!!invoice);

 async function downloadPdf() {
  if (!acc || !statement || !canDownload) return;
  try {
   const {PDFDocument,StandardFonts,rgb}=await import("pdf-lib");
   const doc=await PDFDocument.create();
   const font=await doc.embedFont(StandardFonts.Helvetica);
   const bold=await doc.embedFont(StandardFonts.HelveticaBold);
   let page=doc.addPage([595,842]);
   let y=797;
   const print=(text:string,size=10,strong=false)=>{
    if (y<65){page=doc.addPage([595,842]);y=790;}
    // Latin-1 transliteration for standard PDF fonts; never include full card credentials.
    const clean=text.normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^\x20-\x7e]/g," ");
    page.drawText(clean.slice(0,104),{x:45,y,size,font:strong?bold:font,color:rgb(.12,.2,.22)});y-=size+9;
   };
   print("AXION - DEMONSTRATIVO FINANCEIRO",17,true);
   print("Documento gerado pelo Axion; nao substitui a fatura oficial do banco.",9);
   y-=10;
   print("Cartao: "+name+" / "+acc.institution,12,true);
   print("Final: "+(acc.number||"nao informado")+"  |  Bandeira: "+(brand||"nao informada"));
   print("Competencia: "+period+"  |  Fonte: "+(statement.source==="saved"?"historico salvo":"Open Finance"));
   print("Fechamento: "+date(closing)+"  |  Vencimento: "+date(due));
   print("Limite total: "+safe(limits?.total)+"  |  Disponivel: "+safe(limits?.available));
   print("Limite utilizado: "+safe(limits?.used));
   print("Valor da fatura informada: "+(invoice?safe(invoice.amount):"Nao disponivel"));
   y-=16;print("MOVIMENTACOES DO PERIODO",12,true);
   if (!transactions.length) print("Nenhum lancamento recebido para o periodo.");
   for(const t of transactions) {
    print(date(t.date)+"  |  "+t.description.slice(0,65)+"  |  "+money(t.amount),9);
   }
   y-=10;print("Gerado no Axion - dados sujeitos a atualizacao da instituicao.",8);
   const bytes=await doc.save();
   const blob=new Blob([new Uint8Array(bytes)],{type:"application/pdf"});
   const url=URL.createObjectURL(blob);
   const anchor=document.createElement("a");anchor.href=url;anchor.download=`axion-fatura-${period}-${acc.number||"cartao"}.pdf`;
   document.body.appendChild(anchor);anchor.click();anchor.remove();URL.revokeObjectURL(url);
   toast.success("Demonstrativo PDF gerado.");
  } catch(e){toast.error("Não foi possível gerar o PDF: "+(e as Error).message);}
 }
 return <Dialog open={!!acc} onOpenChange={open=>!open&&onClose()}>
  <DialogContent className="max-h-[88vh] max-w-3xl overflow-y-auto rounded-[26px] border-border/60 p-5 sm:p-7">
   {acc&&<>
    <DialogHeader><DialogTitle className="font-serif text-2xl">Fatura e extrato do cartão</DialogTitle>
     <DialogDescription>{name} • {acc.institution} •••• {acc.number||"—"} • {brand||"bandeira não informada"}</DialogDescription></DialogHeader>
    <div className="grid gap-4 sm:grid-cols-[230px_1fr] sm:items-start">
     <CardFace account={acc} name={name} brand={brand}/>
     <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      <Info label="Limite total" value={safe(limits?.total)}/>
      <Info label="Disponível" value={safe(limits?.available)}/>
      <Info label="Utilizado" value={safe(limits?.used)}/>
      <Info label="Fechamento" value={date(closing)}/>
      <Info label="Vencimento" value={date(due)}/>
      <Info label="Final" value={"•••• "+(acc.number||"—")}/>
     </div>
    </div>
    <section className="mt-2">
     <div className="mb-3 flex flex-wrap items-center justify-between gap-3"><h3 className="text-base font-bold">Histórico de faturas</h3>
      <label className="flex items-center gap-2 text-xs font-medium">Ano
       <select value={year} onChange={e=>setYear(Number(e.target.value))} className="rounded-xl border bg-card px-3 py-2">
        {Array.from({length:8},(_,i)=>today.getFullYear()-i).map(y=><option key={y} value={y}>{y}</option>)}
       </select>
      </label>
     </div>
     <div className="flex gap-1.5 overflow-x-auto pb-2" aria-label="Selecionar mês">
      {MONTHS.map((label,i)=><button key={label} type="button" aria-pressed={month===i+1} onClick={()=>setMonth(i+1)}
       className={`min-w-12 rounded-xl px-3 py-2 text-xs font-semibold transition ${month===i+1?"bg-primary text-primary-foreground shadow-sm":"border bg-card hover:bg-muted"}`}>{label}</button>)}
     </div>
     {statement&&!statement.historyAvailable&&<p role="status" className="mt-2 text-xs text-amber-700 dark:text-amber-300">Histórico não está sendo salvo: pendente aplicar a migração de cartões no Supabase.</p>}
     {statement?.source==="saved"&&<p role="status" className="mt-2 text-xs text-amber-700 dark:text-amber-300">Dados preservados da última sincronização, não atualizados agora.</p>}
     {q.error&&<p role="alert" className="mt-3 rounded-xl border border-destructive/30 p-3 text-sm text-destructive">{(q.error as Error).message}</p>}
     {q.isLoading&&<p className="py-8 text-center text-sm text-muted-foreground">Consultando Open Finance e histórico salvo…</p>}
     {statement&&<div className="mt-4 rounded-2xl border border-border/60 bg-muted/20 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
       <div><div className="text-xs text-muted-foreground">Fatura da competência {period}</div>
        <div className="mt-1 text-xl font-bold">{invoice?money(invoice.amount):"Valor não disponibilizado"}</div>
       </div>
       <div className="text-right text-xs text-muted-foreground">{statement.source==="saved"?"Histórico salvo":"Open Finance"}<div>{invoice?"Fatura identificada pela instituição":"Sem fatura oficial para este mês"}</div></div>
      </div>
      <div className="mt-4 divide-y divide-border/40">
       {!transactions.length&&<p className="py-5 text-center text-sm text-muted-foreground">Nenhum lançamento disponível nesta competência.</p>}
       {transactions.map(t=><div key={t.id} className="flex items-start justify-between gap-4 py-3 text-sm">
        <div className="min-w-0"><div className="font-medium">{t.description}</div><div className="text-xs text-muted-foreground">{date(t.date)} • {t.category}</div></div>
        <div className={`shrink-0 font-semibold ${t.amount>=0?"text-success":"text-foreground"}`}>{money(t.amount)}</div>
       </div>)}
      </div>
     </div>}
    </section>
    <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t pt-4"><div className="flex items-center gap-2 text-xs text-muted-foreground"><FileText className="size-4"/> PDF demonstrativo Axion, não documento bancário oficial</div>
     <Button variant="brand" disabled={!canDownload} onClick={()=>void downloadPdf()}><Download className="size-4"/>Baixar fatura em PDF</Button></div>
   </>}
  </DialogContent>
 </Dialog>;
}
