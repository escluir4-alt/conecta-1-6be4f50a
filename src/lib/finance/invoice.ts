import type { quoteRevenueInstallments } from './contracts.functions';
import { formatBRL,formatDateBR } from './money';
import { pixRecipientSchema,pixMerchantText } from './pix-recipient';
export { pixRecipientSchema } from './pix-recipient';
export type ContractQuote=Awaited<ReturnType<typeof quoteRevenueInstallments>>;
export async function makePix(key:string,name:string,city:string,cents:number){
  const validated=pixRecipientSchema.parse({key,name,city});
  const {createStaticPix,hasError}=await import('pix-utils');
  const p=createStaticPix({pixKey:validated.key,merchantName:pixMerchantText(validated.name,25),merchantCity:pixMerchantText(validated.city,15),transactionAmount:cents/100});
  if(hasError(p))throw new Error('Chave Pix ou dados do recebedor inválidos.');
  return p.toBRCode();
}
export async function generateInvoice(q:ContractQuote,recipient:{key:string;name:string;city:string}){
  const payload=await makePix(recipient.key,recipient.name,recipient.city,q.total);
  const [{PDFDocument,StandardFonts,rgb},{default:QR}]=await Promise.all([import('pdf-lib'),import('qrcode')]);
  const pdf=await PDFDocument.create();pdf.setTitle(`Fatura — ${q.contract.title}`);
  const font=await pdf.embedFont(StandardFonts.Helvetica);const bold=await pdf.embedFont(StandardFonts.HelveticaBold);
  const token=(name:string)=>{const value=getComputedStyle(document.documentElement).getPropertyValue(name).trim();const canvas=document.createElement('canvas');const ctx=canvas.getContext('2d');if(!ctx)throw new Error('Não foi possível preparar a fatura');ctx.fillStyle=value;ctx.fillRect(0,0,1,1);const p=ctx.getImageData(0,0,1,1).data;return rgb((p[0]??0)/255,(p[1]??0)/255,(p[2]??0)/255);};
  const ink=token('--invoice-ink'),brand=token('--invoice-brand'),paper=token('--invoice-paper'),muted=token('--invoice-muted');
  let page=pdf.addPage([595,842]);let y=730;
  const safe=(s:string)=>[...s.replace(/[\r\n\t]/g,' ')].map(c=>{try{font.encodeText(c);return c;}catch{return '?';}}).join('');
  function header(){page.drawRectangle({x:0,y:748,width:595,height:94,color:brand});page.drawText('Fatura',{x:36,y:788,font:bold,size:30,color:paper});page.drawText('CASA CLARA · CONTRATOS PARCELADOS',{x:36,y:764,font,size:10,color:paper});y=728;}
  function ensure(space:number){if(y-space<42){page=pdf.addPage([595,842]);header();}}
  function text(s:string,size=10,isBold=false){const f=isBold?bold:font;const words=safe(s).split(' ');let line='';for(const w of words){const candidate=line?`${line} ${w}`:w;if(f.widthOfTextAtSize(candidate,size)>515&&line){ensure(size+8);page.drawText(line,{x:36,y,font:f,size,color:ink});y-=size+6;line=w;}else line=candidate;while(f.widthOfTextAtSize(line,size)>515){let len=line.length;while(len>1&&f.widthOfTextAtSize(line.slice(0,len),size)>515)len--;ensure(size+8);page.drawText(line.slice(0,len),{x:36,y,font:f,size,color:ink});y-=size+6;line=line.slice(len);}}if(line){ensure(size+8);page.drawText(line,{x:36,y,font:f,size,color:ink});y-=size+6;}}
  function section(s:string){ensure(42);y-=12;page.drawRectangle({x:36,y:y-5,width:523,height:24,color:brand});page.drawText(safe(s),{x:44,y:y+2,font:bold,size:10,color:paper});y-=25;}
  header();text(`Fatura ${q.contract.id.slice(0,8).toUpperCase()} · Pagamento previsto: ${formatDateBR(q.date)}`,11,true);
  section('PAGADOR');const c=q.contract;text(c.buyer,12,true);text(`CPF: ${c.cpf||'—'} · RG: ${c.rg||'—'}`);text(`${c.address||'—'} · CEP: ${c.postal_code||'—'}`);text(`${c.city||'—'} / ${c.state||'—'}`);text(`Telefone: ${c.phone||'—'} · E-mail: ${c.email||'—'}`);
  section('PAGÁVEL PARA');text(recipient.name,11,true);text(`Cidade: ${recipient.city} · Chave Pix: ${recipient.key}`);
  section('ITEM DO CONTRATO');text(c.title,12,true);text(`Valor total: ${formatBRL(c.total_cents)} · Entrada: ${formatBRL(c.down_payment_cents)} · Saldo contratado: ${formatBRL(c.total_cents-c.down_payment_cents)}`);if(c.note)text(c.note);
  section('PARCELAS SELECIONADAS E DESCRITIVO DE CÁLCULO');
  for(const r of q.rows){ensure(100);text(`Parcela ${r.entry.number} · Vencimento ${formatDateBR(r.entry.due_date)} · Original ${formatBRL(r.entry.expected_cents)}`,11,true);text(`Juros: ${c.interest_percent}% ao mês × ${r.charges.days}/30 dias = ${formatBRL(r.charges.interestCents)}`);text(`Multa: ${c.fine_percent}% = ${formatBRL(r.charges.fineCents)}`);text(`Correção ${c.correction_index}: ${r.rate.toFixed(6).replace('.',',')}% = ${formatBRL(r.charges.correctionCents)}`);if(r.months.length)text(`Referências: ${r.months.map(m=>`${m.month} (${m.rate}%)`).join('; ')}`,9);text(`Total da parcela: ${formatBRL(r.charges.total)}`,11,true);y-=8;}
  if(q.latest){text(`Fonte: ${q.source} · Último índice disponível: ${q.latest}`,9);text(q.convention,9);}
  ensure(230);section('TOTAL A SER COBRADO');text(formatBRL(q.total),22,true);
  const qr=await QR.toDataURL(payload,{width:420,margin:2,errorCorrectionLevel:'M'});const image=await pdf.embedPng(qr);page.drawImage(image,{x:36,y:y-140,width:140,height:140});page.drawText('PIX',{x:197,y:y-22,font:bold,size:15,color:brand});page.drawText('Valor: '+formatBRL(q.total),{x:197,y:y-47,font:bold,size:12,color:ink});page.drawText('Confira o recebedor antes de pagar.',{x:197,y:y-68,font,size:10,color:muted});y-=150;text('Pix copia e cola:',9,true);text(payload,7);
  const bytes=await pdf.save();return {blob:new Blob([new Uint8Array(bytes)],{type:'application/pdf'}),payload,qr};
}
export function deliverInvoice(blob:Blob,filename:string){const file=new File([blob],filename,{type:blob.type});if(matchMedia('(pointer: coarse)').matches&&navigator.canShare?.({files:[file]})){void navigator.share({files:[file],title:filename}).catch(e=>{if(e.name!=='AbortError')download();});return;}download();function download(){const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=filename;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);}}