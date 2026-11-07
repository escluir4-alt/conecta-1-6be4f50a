import { useEffect,useMemo,useRef,useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery,useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AreaChart,BarChart3,Camera,Check,ChevronLeft,ChevronRight,Download,Eye,FileText,FolderArchive,MoreVertical,Printer,Search,ShoppingCart,ScanLine,Upload,Trash2,X } from "lucide-react";
import { Bar,BarChart,CartesianGrid,ResponsiveContainer,Tooltip,XAxis,YAxis } from "recharts";
import { AppShell,useRequireUser } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog,DialogContent,DialogDescription,DialogHeader,DialogTitle } from "@/components/ui/dialog";
import { brl,deleteFiscal,downloadFiscal,fileUrl,getDocumentItems,getDocuments,parseBRL,saveDocument,updateFiscalMetadata,type FiscalDoc,type FiscalDraft,type FiscalItem } from "@/lib/fiscal";

const MONTHS=["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
const today=new Date().toISOString().slice(0,10);
const emptyDraft: FiscalDraft={issuer:"",issued_on:today,document_number:"",access_key:"",total:"",category:"outros"};
type View="notas"|"arquivo"|"mercado";
const surface="rounded-2xl border border-border bg-card shadow-sm";
const fmtDate=(s:string)=>s.split("-").reverse().join("/");
const monthNumber=(s:string)=>Number(s.slice(5,7));
export function FiscalWorkspace({view="notas"}:{view?:View}){
 const user=useRequireUser(),qc=useQueryClient();
 const picker=useRef<HTMLInputElement>(null),cameraPicker=useRef<HTMLInputElement>(null),scannerPicker=useRef<HTMLInputElement>(null);\n const [scanMode,setScanMode]=useState<"qr_code"|"ean_13">("qr_code");
 const [year,setYear]=useState(String(new Date().getFullYear()));
 const [month,setMonth]=useState("all");
 const [search,setSearch]=useState("");
 const [type,setType]=useState("all");
 const [selected,setSelected]=useState<FiscalDoc|null>(null);
 const [preview,setPreview]=useState("");
 const [original,setOriginal]=useState(false);
 const [openForm,setOpenForm]=useState(false),[file,setFile]=useState<File|null>(null);
 const [draft,setDraft]=useState<FiscalDraft>(emptyDraft),[reviewed,setReviewed]=useState(false);
 const [busy,setBusy]=useState(false),[page,setPage]=useState(1);\n const [editing,setEditing]=useState<FiscalDoc|null>(null);
 const [items,setItems]=useState<{description:string;quantity:string;unit:string;total:string}[]>([]);
 const [marketTab,setMarketTab]=useState<"resumo"|"compras"|"produtos"|"analises">("resumo");
 const [report,setReport]=useState<"mensal"|"anual"|"supermercado"|"categoria">("mensal");
 const query=useQuery({queryKey:["axion-fiscal",user?.email],queryFn:getDocuments,enabled:!!user,staleTime:20000,retry:1});
 const docs=query.data??[];
 const itemQuery=useQuery({queryKey:["axion-fiscal-items",user?.email,docs.map(d=>d.id).join(",")],queryFn:()=>getDocumentItems(docs.map(d=>d.id)),enabled:!!user&&docs.length>0});
 const allItems=itemQuery.data??[];
 const market=docs.filter(d=>d.category==="mercado");
 const years=Array.from(new Set([String(new Date().getFullYear()),...docs.map(d=>d.issued_on.slice(0,4))])).sort().reverse();
 const visible=docs.filter(d=>(view!=="mercado"||d.category==="mercado")&&d.issued_on.startsWith(year)&&(month==="all"||monthNumber(d.issued_on)===Number(month))&&(type==="all"||d.category===type)&&[d.issuer,d.document_number??"",d.access_key??"",d.original_name].join(" ").toLowerCase().includes(search.toLowerCase())).sort((a,b)=>b.issued_on.localeCompare(a.issued_on));
 const total=visible.reduce((s,d)=>s+d.total_cents,0);
 const monthDocs=market.filter(d=>d.issued_on.startsWith(year)&&(month==="all"||monthNumber(d.issued_on)===Number(month)));
 const monthTotal=market.filter(d=>d.issued_on.startsWith(year)&&monthNumber(d.issued_on)===new Date().getMonth()+1).reduce((s,d)=>s+d.total_cents,0);
 const annual=market.filter(d=>d.issued_on.startsWith(year));
 const annualTotal=annual.reduce((s,d)=>s+d.total_cents,0);
 const activeMonths=new Set(annual.map(d=>monthNumber(d.issued_on))).size;
 const chart=MONTHS.map((name,i)=>({name:name.slice(0,3),value:annual.filter(d=>monthNumber(d.issued_on)===i+1).reduce((s,d)=>s+d.total_cents,0)/100}));
 const selectedItems=allItems.filter(x=>x.document_id===selected?.id);
 const pageSize=8,count=Math.max(1,Math.ceil(visible.length/pageSize));
 const displayed=visible.slice((Math.min(page,count)-1)*pageSize,Math.min(page,count)*pageSize);
 useEffect(()=>{setPage(1)},[year,month,search,type,view]);
 useEffect(()=>{let cancelled=false;setPreview("");if(!selected)return;void fileUrl(original?selected.original_path:selected.pdf_path).then(u=>{if(!cancelled)setPreview(u)}).catch(e=>toast.error(e instanceof Error?e.message:"Falha ao abrir documento"));return()=>{cancelled=true}},[selected,original]);
 const choose=(f?:File)=>{if(!f)return;setEditing(null);setFile(f);setDraft({...emptyDraft,category:view==="mercado"?"mercado":"outros"});setItems([]);setReviewed(false);setOpenForm(true)};
 const scanImage=async(f?:File)=>{
  if(!f)return;
  type Detected={rawValue:string;format?:string};
  type DetectorCtor=new (args:{formats:string[]})=>{detect:(image:ImageBitmap)=>Promise<Detected[]>};
  const Detector=(globalThis as typeof globalThis & {BarcodeDetector?:DetectorCtor}).BarcodeDetector;
  if(!Detector){toast.info("Leitura automática não disponível neste navegador. Importe a foto para cadastrar manualmente.");choose(f);return;}
  try{
   const bmp=await createImageBitmap(f);
   const scanner=new Detector({formats:scanMode==="qr_code"?["qr_code"]:["ean_13","code_128"]});
   const codes=await scanner.detect(bmp);bmp.close();
   if(!codes.length){toast.info("Nenhum código legível. Revise a qualidade da foto.");choose(f);return;}
   const value=codes[0]?.rawValue??"";
   choose(f);
   if(scanMode==="qr_code"){
    const match=value.match(/(?:[?&]chNFe=|[?&]p=)(\\d{44})/)??value.match(/\\b\\d{44}\\b/);
    const key=match?.[1]??(match?.[0]?.length===44?match[0]:"");
    if(key)setDraft(x=>({...x,access_key:key}));
    toast.info(key?"Chave detectada. Confira os dados e importe o documento fiscal.":"QR identificado; revise a nota. O QR não comprova autenticidade.");
   }else toast.info("Código identificado: "+value+". Confira o documento antes de arquivar.");
  }catch(e){toast.error(e instanceof Error?e.message:"Não foi possível ler o código");choose(f)}
 };
 const save=async()=>{
  if((!file&&!editing)||!reviewed)return;
  setBusy(true);
  try{
   const rows=items.filter(x=>x.description.trim()).map(x=>({description:x.description.trim(),quantity:Number(x.quantity.replace(",",".")),unit_price_cents:parseBRL(x.unit),total_cents:parseBRL(x.total)}));
   if(rows.some(x=>!Number.isFinite(x.quantity)||x.quantity<=0))throw Error("Quantidade de produto inválida");
   if(editing){ const updated=await updateFiscalMetadata(editing.id,draft);setSelected(updated); }else if(file) await saveDocument(file,draft,rows);\n   await qc.invalidateQueries({queryKey:["axion-fiscal"]});setOpenForm(false);setFile(null);setEditing(null);toast.success(editing?"Informações atualizadas":"Nota fiscal arquivada com sucesso");
  }catch(e){toast.error(e instanceof Error?e.message:"Erro ao salvar nota")}finally{setBusy(false)}
 };
 const beginEdit=(d:FiscalDoc)=>{setEditing(d);setFile(null);setDraft({issuer:d.issuer,issued_on:d.issued_on,document_number:d.document_number??"",access_key:d.access_key??"",total:(d.total_cents/100).toFixed(2).replace(".",","),category:d.category});setReviewed(false);setOpenForm(true)};\n const remove=async(d:FiscalDoc)=>{if(!window.confirm("Excluir esta nota e seus arquivos? Esta ação não pode ser desfeita."))return;try{await deleteFiscal(d);setSelected(null);await qc.invalidateQueries({queryKey:["axion-fiscal"]});toast.success("Nota excluída")}catch(e){toast.error(e instanceof Error?e.message:"Falha ao excluir")}};
 const open=(d:FiscalDoc)=>{setOriginal(false);setSelected(d)};
 const buttons=<div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
   <input ref={cameraPicker} type="file" accept="image/*" capture="environment" className="hidden" onChange={e=>{choose(e.target.files?.[0]);e.target.value=""}}/>
   <input ref={scannerPicker} type="file" accept="image/*" capture="environment" className="hidden" onChange={e=>{void scanImage(e.target.files?.[0]);e.target.value=""}}/>\n   <input ref={picker} type="file" accept="application/pdf,image/png,image/jpeg,image/webp" className="hidden" onChange={e=>{choose(e.target.files?.[0]);e.target.value=""}}/>
   <Button className="h-14 gap-2 bg-primary text-primary-foreground shadow-soft hover:bg-primary/90" onClick={()=>cameraPicker.current?.click()}><Camera className="size-5"/>Fotografar nota</Button>
   <Button variant="outline" className="h-14 gap-2" onClick={()=>{setScanMode("qr_code");scannerPicker.current?.click()}}><ScanLine className="size-5"/>Ler QR Code</Button>
   <Button variant="outline" className="h-14 gap-2" onClick={()=>{setScanMode("ean_13");scannerPicker.current?.click()}}><ScanLine className="size-5"/>Ler código de barras</Button>
   <Button variant="outline" className="h-14 gap-2" onClick={()=>picker.current?.click()}><Upload className="size-5"/>Importar arquivo</Button>
 </div>;
 const metrics=<div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
  {[[<FileText className="size-6 text-primary"/>,view==="mercado"?"Notas de mercado":"Total de notas",String(visible.length)],
    [<FolderArchive className="size-6 text-primary"/>,"Valor total",brl(total)],
    [<ShoppingCart className="size-6 text-primary"/>,"Compras no ano",String(annual.length)],
    [<AreaChart className="size-6 text-primary"/>,"Gastos no mês",brl(monthTotal)]].map(([icon,label,value],i)=><div key={i} className={surface+" flex items-center gap-3 p-4"}>{icon}<div className="min-w-0"><p className="text-xs text-muted-foreground">{label}</p><p className="truncate text-lg font-bold tabular-nums">{value}</p></div></div>)}
 </div>;
 const filters=<div className="flex flex-wrap gap-2">
  <select aria-label="Ano" value={year} onChange={e=>setYear(e.target.value)} className="rounded-lg border bg-background px-3 py-2 text-sm">{years.map(y=><option key={y}>{y}</option>)}</select>
  <select aria-label="Mês" value={month} onChange={e=>setMonth(e.target.value)} className="rounded-lg border bg-background px-3 py-2 text-sm"><option value="all">Todos os meses</option>{MONTHS.map((m,i)=><option key={m} value={i+1}>{m}</option>)}</select>
  {view!=="mercado"&&<select aria-label="Categoria" value={type} onChange={e=>setType(e.target.value)} className="rounded-lg border bg-background px-3 py-2 text-sm"><option value="all">Todas as categorias</option><option value="mercado">Mercado</option><option value="outros">Outros</option></select>}
  <div className="relative min-w-[200px] flex-1"><Search className="absolute left-3 top-2.5 size-4 text-muted-foreground"/><Input aria-label="Buscar notas" className="pl-9" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar fornecedor, número ou chave..."/></div>
 </div>;
 const table=<div className="overflow-x-auto"><table className="w-full min-w-[590px] text-left text-sm"><thead><tr className="border-b text-xs text-muted-foreground"><th className="p-3">Data</th><th className="p-3">Fornecedor</th><th className="p-3">Nº da NF</th><th className="p-3">Categoria</th><th className="p-3 text-right">Valor</th><th className="p-3 text-right">Ações</th></tr></thead><tbody>{displayed.map(d=><tr key={d.id} className={`border-b last:border-0 hover:bg-primary/5 ${selected?.id===d.id?"bg-primary/10":""}`}><td className="p-3 whitespace-nowrap">{fmtDate(d.issued_on)}</td><td className="p-3 font-medium">{d.issuer}</td><td className="p-3">{d.document_number||"—"}</td><td className="p-3">{d.category==="mercado"?"🛒 Mercado":"📄 Outros"}</td><td className="p-3 text-right font-semibold whitespace-nowrap">{brl(d.total_cents)}</td><td className="p-2 text-right whitespace-nowrap"><Button size="icon" variant="ghost" aria-label="Visualizar" onClick={()=>open(d)}><Eye className="size-4"/></Button><Button size="icon" variant="ghost" aria-label="Baixar PDF" onClick={()=>void downloadFiscal(d.pdf_path,`nota-${d.document_number||d.id}.pdf`).catch(()=>toast.error("Falha no download"))}><Download className="size-4"/></Button><Button size="icon" variant="ghost" aria-label="Excluir nota" onClick={()=>void remove(d)}><Trash2 className="size-4 text-destructive"/></Button></td></tr>)}</tbody></table>
  {query.isLoading&&<p className="p-8 text-center text-muted-foreground">Carregando documentos...</p>}
  {query.isError&&<p role="alert" className="p-5 text-destructive">Não foi possível consultar o arquivo fiscal. Verifique a migração e a conexão do Supabase.</p>}
  {!query.isLoading&&!query.isError&&!visible.length&&<p className="p-8 text-center text-muted-foreground">Nenhuma nota encontrada. Importe uma nota para iniciar o arquivo.</p>}
  <div className="flex items-center justify-between gap-3 border-t px-4 py-3 text-xs text-muted-foreground"><span>{visible.length} notas · {brl(total)}</span><div className="flex items-center gap-2"><Button variant="ghost" size="icon" aria-label="Anterior" disabled={page===1} onClick={()=>setPage(p=>p-1)}><ChevronLeft className="size-4"/></Button>{Math.min(page,count)} / {count}<Button variant="ghost" size="icon" aria-label="Próximo" disabled={page>=count} onClick={()=>setPage(p=>p+1)}><ChevronRight className="size-4"/></Button></div></div>
 </div>;
 const details=selected?<div className={surface+" min-w-0 overflow-hidden"}><div className="flex items-center justify-between border-b p-4"><div><h2 className="font-semibold">Nota Fiscal Nº {selected.document_number||"s/n"}</h2><p className="text-xs text-muted-foreground">{selected.issuer}</p></div><Button variant="ghost" size="icon" onClick={()=>setSelected(null)} aria-label="Fechar"><X/></Button></div>
  <div className="flex gap-2 border-b p-3"><Button size="sm" variant={!original?"default":"outline"} onClick={()=>setOriginal(false)}>PDF gerado</Button><Button size="sm" variant={original?"default":"outline"} onClick={()=>setOriginal(true)}>Original</Button></div>
  <div className="grid gap-3 p-3 lg:grid-cols-[minmax(0,1fr)_190px]"><div className="min-h-[430px] rounded-lg border bg-muted/50">{preview?(original&&selected.original_path!==selected.pdf_path&&/\.(png|jpg|jpeg|webp)$/i.test(selected.original_path)?<img alt="Arquivo original da nota" src={preview} className="mx-auto max-h-[550px] object-contain"/>:<iframe title="Documento fiscal" src={preview} className="h-[540px] w-full"/>):<p className="p-4 text-sm text-muted-foreground">Carregando visualização segura...</p>}</div>
  <div className="space-y-3 rounded-xl bg-muted/40 p-3 text-sm"><h3 className="font-semibold">Informações da nota</h3><p><span className="text-xs text-muted-foreground">Fornecedor</span><br/>{selected.issuer}</p><p><span className="text-xs text-muted-foreground">Data de emissão</span><br/>{fmtDate(selected.issued_on)}</p><p><span className="text-xs text-muted-foreground">Categoria</span><br/>{selected.category==="mercado"?"Mercado":"Outros"}</p><p className="font-bold text-primary">{brl(selected.total_cents)}</p><p className="break-all text-xs text-muted-foreground">Chave: {selected.access_key||"Não informada"}</p></div></div>
  {selectedItems.length>0&&<div className="px-4 pb-3"><h3 className="font-semibold">Produtos e serviços ({selectedItems.length})</h3><div className="mt-2 divide-y text-sm">{selectedItems.map(it=><div key={it.id} className="flex justify-between gap-2 py-2"><span>{it.description} · {it.quantity} un.</span><span>{brl(it.total_cents)}</span></div>)}</div></div>}
  <div className="flex flex-wrap gap-2 border-t p-3"><Button size="sm" onClick={()=>void downloadFiscal(selected.pdf_path,`nota-${selected.document_number||selected.id}.pdf`)}><Download className="mr-2 size-4"/>Baixar PDF</Button><Button size="sm" variant="outline" onClick={()=>void downloadFiscal(selected.original_path,selected.original_name)}>Arquivo original</Button><Button size="sm" variant="outline" onClick={()=>beginEdit(selected)}>Editar informações</Button><Button size="sm" variant="outline" onClick={()=>preview&&window.open(preview,"_blank","noopener,noreferrer")}>Ampliar</Button></div>
 </div>:<div className={surface+" flex min-h-[340px] flex-col items-center justify-center gap-3 p-6 text-center"}><FileText className="size-12 text-primary/50"/><p className="font-semibold">Visualização da nota fiscal</p><p className="max-w-xs text-sm text-muted-foreground">Selecione uma nota na tabela para visualizar o PDF original, os produtos e os dados registrados.</p></div>;
 const marketPanel=<div className="space-y-5">
  <div className="flex flex-wrap gap-2">{(["resumo","compras","produtos","analises"] as const).map(t=><Button key={t} size="sm" variant={marketTab===t?"default":"outline"} className="capitalize" onClick={()=>setMarketTab(t)}>{t==="analises"?"Análises":t==="resumo"?"Resumo":t==="compras"?"Compras":"Produtos"}</Button>)}</div>
  <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{[["Este mês",brl(monthTotal)],["Média mensal",brl(activeMonths?annualTotal/activeMonths:0)],["Total no ano",brl(annualTotal)],["Notas",String(annual.length)]].map(([a,b])=><div key={a} className={surface+" p-4"}><p className="text-xs text-muted-foreground">{a}</p><p className="mt-1 text-lg font-bold">{b}</p></div>)}</div>
  {(marketTab==="resumo"||marketTab==="analises")&&<div className={surface+" p-5"}><div className="mb-4 flex flex-wrap items-center justify-between gap-2"><h2 className="font-semibold">Relatório de mercado — {year}</h2><div className="flex flex-wrap gap-2">{(["mensal","anual","supermercado","categoria"] as const).map(x=><Button size="sm" variant={report===x?"default":"outline"} key={x} onClick={()=>setReport(x)} className="capitalize">{x==="supermercado"?"Por supermercado":x==="categoria"?"Por categoria":x}</Button>)}</div></div>
  {(report==="mensal"||report==="anual")?<div className="h-[300px] w-full"><ResponsiveContainer width="100%" height="100%"><BarChart data={chart}><CartesianGrid strokeDasharray="3 3" stroke="var(--border)"/><XAxis dataKey="name"/><YAxis tickFormatter={v=>String(v)}/><Tooltip formatter={value=>brl(Number(value)*100)}/><Bar dataKey="value" name="Gasto" fill="var(--primary)" radius={[5,5,0,0]}/></BarChart></ResponsiveContainer></div>:<div className="space-y-3">{(report==="supermercado"?Object.entries(annual.reduce<Record<string,number>>((a,d)=>(a[d.issuer]=(a[d.issuer]||0)+d.total_cents,a),{})):Object.entries({"Mercado":annualTotal})).sort((a,b)=>b[1]-a[1]).map(([name,cents])=><div key={name} className="flex justify-between border-b py-2 text-sm"><span>{name}</span><strong>{brl(cents)}</strong></div>)}</div>}</div>}
  {(marketTab==="compras"||marketTab==="resumo")&&<div className={surface+" p-4"}><h2 className="mb-3 font-semibold">Compras de supermercado</h2>{filters}{table}</div>}
  {marketTab==="produtos"&&<div className={surface+" p-4"}><h2 className="mb-3 font-semibold">Produtos reconhecidos e conferidos</h2><div className="divide-y">{allItems.filter(i=>monthDocs.some(d=>d.id===i.document_id)).map(i=><div className="flex justify-between gap-3 py-3 text-sm" key={i.id}><span>{i.description} · {i.quantity}</span><b>{brl(i.total_cents)}</b></div>)}{!allItems.length&&<p className="p-4 text-sm text-muted-foreground">Ainda não existem produtos registrados nas notas de mercado.</p>}</div></div>}
 </div>;
 return <AppShell active="notas-fiscais" user={user}><div className="mx-auto max-w-[1700px] space-y-5 p-4 md:p-6">
  <div className="flex flex-wrap items-center justify-between gap-3"><div className="flex items-center gap-3"><FileText className="size-9 text-primary"/><div><h1 className="text-2xl font-bold">{view==="mercado"?"Notas de Mercado":view==="arquivo"?"Arquivo Fiscal":"Notas Fiscais"}</h1><p className="text-sm text-muted-foreground">Digitalize, identifique, organize e arquive seus documentos fiscais.</p></div></div><div className="flex flex-wrap gap-2"><Button asChild variant={view==="notas"?"default":"outline"} size="sm"><Link to="/notas-fiscais">Notas fiscais</Link></Button><Button asChild variant={view==="arquivo"?"default":"outline"} size="sm"><Link to="/arquivo-fiscal">Arquivo fiscal</Link></Button><Button asChild variant={view==="mercado"?"default":"outline"} size="sm"><Link to="/mercado-fiscal">Notas de mercado</Link></Button></div></div>
  {buttons}{metrics}
  {view==="mercado"?<>{marketPanel}<div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(360px,.8fr)]">{details}</div></>:<div className="grid gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(370px,1fr)]"><section className={surface+" min-w-0 overflow-hidden"}><div className="p-4"><div className="mb-3 flex flex-wrap items-center justify-between gap-2"><h2 className="text-lg font-bold">{view==="arquivo"?"Arquivo de notas fiscais":"Histórico de notas fiscais"}</h2><span className="text-xs text-muted-foreground">Ano › Mês › Dia</span></div>{filters}</div>{table}</section>{details}</div>}
  <p className="text-xs text-muted-foreground">Documentos privados vinculados à conta. O arquivo original é preservado. As notas não geram despesas automaticamente.</p>
 </div>
 <Dialog open={openForm} onOpenChange={v=>!busy&&setOpenForm(v)}><DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl"><DialogHeader><DialogTitle>{editing?"Editar informações da nota":"Arquivar nota fiscal"}</DialogTitle><DialogDescription>Revise os dados da nota antes de confirmar. Nenhum documento será enviado a serviços externos de IA.</DialogDescription></DialogHeader><div className="grid gap-3 sm:grid-cols-2">
  <p className="sm:col-span-2 rounded-lg bg-muted p-3 text-sm break-all">{editing?editing.original_name:file?.name}</p>
  <label className="space-y-1 text-sm">Fornecedor / emitente<Input value={draft.issuer} onChange={e=>setDraft({...draft,issuer:e.target.value})}/></label>
  <label className="space-y-1 text-sm">Data de emissão<Input type="date" value={draft.issued_on} onChange={e=>setDraft({...draft,issued_on:e.target.value})}/></label>
  <label className="space-y-1 text-sm">Número da nota<Input value={draft.document_number} onChange={e=>setDraft({...draft,document_number:e.target.value})}/></label>
  <label className="space-y-1 text-sm">Valor (ex.: 123,45)<Input value={draft.total} onChange={e=>setDraft({...draft,total:e.target.value})}/></label>
  <label className="space-y-1 text-sm sm:col-span-2">Chave de acesso (44 dígitos, opcional)<Input maxLength={44} value={draft.access_key} onChange={e=>setDraft({...draft,access_key:e.target.value.replace(/\D/g,"")})}/></label>
  <label className="space-y-1 text-sm">Categoria<select className="block w-full rounded-lg border bg-background p-2" value={draft.category} onChange={e=>setDraft({...draft,category:e.target.value as "mercado"|"outros"})}><option value="outros">Outros</option><option value="mercado">Supermercado</option></select></label>
  {draft.category==="mercado"&&!editing&&<div className="space-y-2 sm:col-span-2"><div className="flex items-center justify-between"><strong className="text-sm">Produtos (opcional)</strong><Button size="sm" variant="outline" onClick={()=>setItems(p=>[...p,{description:"",quantity:"1",unit:"0,00",total:"0,00"}])}>Adicionar produto</Button></div>{items.map((x,i)=><div key={i} className="grid grid-cols-[1fr_65px_90px_90px_30px] gap-1"><Input aria-label="Produto" placeholder="Produto" value={x.description} onChange={e=>setItems(p=>p.map((v,j)=>j===i?{...v,description:e.target.value}:v))}/><Input aria-label="Quantidade" value={x.quantity} onChange={e=>setItems(p=>p.map((v,j)=>j===i?{...v,quantity:e.target.value}:v))}/><Input aria-label="Unitário" value={x.unit} onChange={e=>setItems(p=>p.map((v,j)=>j===i?{...v,unit:e.target.value}:v))}/><Input aria-label="Total" value={x.total} onChange={e=>setItems(p=>p.map((v,j)=>j===i?{...v,total:e.target.value}:v))}/><Button size="icon" variant="ghost" aria-label="Remover produto" onClick={()=>setItems(p=>p.filter((_,j)=>j!==i))}><X/></Button></div>)}</div>}
  <label className="flex items-center gap-2 text-sm sm:col-span-2"><input type="checkbox" checked={reviewed} onChange={e=>setReviewed(e.target.checked)}/>Conferi os dados acima e autorizo o arquivamento.</label>
 </div><div className="flex justify-end gap-2"><Button variant="outline" disabled={busy} onClick={()=>setOpenForm(false)}>Cancelar</Button><Button disabled={!reviewed||busy} onClick={()=>void save()}>{busy?"Salvando...":editing?"Salvar alterações":"Salvar nota fiscal"}</Button></div></DialogContent></Dialog>
 </AppShell>
}
