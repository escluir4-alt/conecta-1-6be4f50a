import { PDFDocument } from "pdf-lib";
import { supabase } from "@/integrations/supabase/client";

export type FiscalDoc = {
 id:string; user_id:string; issuer:string; issued_on:string; document_number:string|null;
 access_key:string|null; total_cents:number; category:"mercado"|"outros";
 original_path:string; pdf_path:string; original_name:string; file_sha256:string; verified:boolean; created_at:string;
};
export type FiscalItem = { id:string; document_id:string; user_id:string; description:string; quantity:number; unit_price_cents:number; total_cents:number };
export type FiscalDraft = { issuer:string; issued_on:string; document_number:string; access_key:string; total:string; category:"mercado"|"outros" };
const BUCKET="fiscal-private";
const client = supabase as unknown as {from:(table:string)=>any};
export function brl(cents:number){return new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL"}).format(cents/100);}
export function parseBRL(raw:string){
 const clean=raw.trim().replace(/^R\$\s*/,"");
 if(!/^(?:\d{1,3}(?:\.\d{3})+|\d+)(?:,\d{1,2})?$/.test(clean)) throw Error("Valor inválido: use 1.234,56");
 const [whole,decimal=""]=clean.split(",");
 const cents=Number(whole.replaceAll(".",""))*100+Number(decimal.padEnd(2,"0"));
 if(!Number.isSafeInteger(cents)||cents<0) throw Error("Valor fora do limite");
 return cents;
}
export function checkDate(value:string){
 if(!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
 const [y,m,d]=value.split("-").map(Number);const dt=new Date(Date.UTC(y,m-1,d));
 return dt.getUTCFullYear()===y&&dt.getUTCMonth()===m-1&&dt.getUTCDate()===d;
}
export function validateFiscal(file:File,draft:FiscalDraft){
 if(!["application/pdf","image/png","image/jpeg","image/webp"].includes(file.type)) throw Error("Somente PDF, JPEG, PNG e WebP");
 if(file.size>15*1024*1024||!file.size) throw Error("Arquivo vazio ou superior a 15 MB");
 if(!draft.issuer.trim()||!checkDate(draft.issued_on)) throw Error("Informe emitente e data válida");
 if(draft.access_key.trim()&&!/^\d{44}$/.test(draft.access_key.trim())) throw Error("A chave deve conter 44 dígitos");
 return parseBRL(draft.total);
}
async function realFileType(file:File){
 const a=new Uint8Array(await file.slice(0,12).arrayBuffer());
 const pdf=[37,80,68,70,45],png=[137,80,78,71,13,10,26,10],jpg=[255,216,255];
 const begins=(bytes:number[])=>bytes.every((b,i)=>a[i]===b);
 const webp=String.fromCharCode(...a.slice(0,4))==="RIFF"&&String.fromCharCode(...a.slice(8,12))==="WEBP";
 if(!(file.type==="application/pdf"&&begins(pdf)||file.type==="image/png"&&begins(png)||file.type==="image/jpeg"&&begins(jpg)||file.type==="image/webp"&&webp))throw Error("A assinatura do arquivo não corresponde ao formato");
}
async function buildPdf(file:File):Promise<File>{
 if(file.type==="application/pdf")return file;
 const doc=await PDFDocument.create();const bytes=new Uint8Array(await file.arrayBuffer());
 let image;
 if(file.type==="image/jpeg")image=await doc.embedJpg(bytes);
 else if(file.type==="image/png")image=await doc.embedPng(bytes);
 else {
   const bmp=await createImageBitmap(file);
   const canvas=document.createElement("canvas");canvas.width=bmp.width;canvas.height=bmp.height;
   const ctx=canvas.getContext("2d");if(!ctx)throw Error("Não foi possível converter WebP");
   ctx.drawImage(bmp,0,0);bmp.close();
   image=await doc.embedPng(new Uint8Array(await (await fetch(canvas.toDataURL("image/png"))).arrayBuffer()));
 }
 const w=image.width,h=image.height; const scale=Math.min(595/w,842/h,1);
 const page=doc.addPage([595,842]);page.drawImage(image,{x:(595-w*scale)/2,y:(842-h*scale)/2,width:w*scale,height:h*scale});
 return new File([await doc.save()],"nota.pdf",{type:"application/pdf"});
}
export async function getDocuments():Promise<FiscalDoc[]>{
 const {data,error}=await client.from("fiscal_documents").select("*").order("issued_on",{ascending:false});
 if(error)throw error;return (data??[]) as FiscalDoc[];
}
export async function getDocumentItems(ids:string[]):Promise<FiscalItem[]>{
 if(!ids.length)return [];
 const {data,error}=await client.from("fiscal_document_items").select("*").in("document_id",ids);
 if(error)throw error;return (data??[]) as FiscalItem[];
}
export async function saveDocument(file:File,draft:FiscalDraft,items:Omit<FiscalItem,"id"|"document_id"|"user_id">[]){
 const cents=validateFiscal(file,draft);await realFileType(file);
 const {data:{user},error:authError}=await supabase.auth.getUser();
 if(authError||!user)throw Error("Faça login para salvar");
 const hash=Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256",await file.arrayBuffer()))).map(x=>x.toString(16).padStart(2,"0")).join("");
 const {data:duplicate,error:duplicateError}=await client.from("fiscal_documents").select("id").eq("user_id",user.id).eq("file_sha256",hash).limit(1);
 if(duplicateError)throw duplicateError;
 if(duplicate?.length)throw Error("Este arquivo já está arquivado");
 if(draft.access_key.trim()){
  const {data:found,error:keyError}=await client.from("fiscal_documents").select("id").eq("user_id",user.id).eq("access_key",draft.access_key.trim()).limit(1);
  if(keyError)throw keyError;if(found?.length)throw Error("Esta chave de acesso já está cadastrada");
 }
 const id=crypto.randomUUID();const [year,month,day]=draft.issued_on.split("-");
 const root=`${user.id}/${year}/${month}/${day}/${id}`;
 const ext=file.type==="application/pdf"?"pdf":file.type==="image/png"?"png":file.type==="image/webp"?"webp":"jpg";
 const originalPath=`${root}/original.${ext}`,pdfPath=`${root}/nota.pdf`;
 const saved:string[]=[];let inserted=false;
 try{
  const {error:originalError}=await supabase.storage.from(BUCKET).upload(originalPath,file,{contentType:file.type,upsert:false});
  if(originalError)throw originalError;saved.push(originalPath);
  if(pdfPath!==originalPath){
    const pdf=await buildPdf(file);
    const {error:pdfError}=await supabase.storage.from(BUCKET).upload(pdfPath,pdf,{contentType:"application/pdf",upsert:false});
    if(pdfError)throw pdfError;saved.push(pdfPath);
  }
  const {error:insertError}=await client.from("fiscal_documents").insert({
   id,user_id:user.id,issuer:draft.issuer.trim(),issued_on:draft.issued_on,
   document_number:draft.document_number.trim()||null,access_key:draft.access_key.trim()||null,
   category:draft.category,total_cents:cents,original_path:originalPath,pdf_path:file.type==="application/pdf"?originalPath:pdfPath,
   original_name:file.name,file_sha256:hash,verified:true
  });
  if(insertError)throw insertError;inserted=true;
  if(items.length){
   const {error:itemsError}=await client.from("fiscal_document_items").insert(items.map(x=>({...x,user_id:user.id,document_id:id})));
   if(itemsError)throw itemsError;
  }
  return id;
 }catch(error){
  if(inserted)await client.from("fiscal_documents").delete().eq("id",id).eq("user_id",user.id);
  if(saved.length)await supabase.storage.from(BUCKET).remove(saved);
  throw error;
 }
}
export async function fileUrl(path:string){
 const {data,error}=await supabase.storage.from(BUCKET).createSignedUrl(path,120);
 if(error)throw error;return data.signedUrl;
}
export async function downloadFiscal(path:string,name:string){
 const {data,error}=await supabase.storage.from(BUCKET).download(path);if(error)throw error;
 const url=URL.createObjectURL(data);const a=document.createElement("a");a.href=url;a.download=name;a.click();
 setTimeout(()=>URL.revokeObjectURL(url),10000);
}
export async function deleteFiscal(doc:FiscalDoc){
 const {error}=await client.from("fiscal_documents").delete().eq("id",doc.id).eq("user_id",doc.user_id);
 if(error)throw error;
 const paths=[...new Set([doc.original_path,doc.pdf_path])];
 const {error:storageError}=await supabase.storage.from(BUCKET).remove(paths);
 if(storageError)throw Error("Registro excluído; limpeza do arquivo pendente: "+storageError.message);
}
