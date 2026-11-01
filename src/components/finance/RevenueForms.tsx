import { useState, type ReactNode } from 'react';
import { useServerFn } from '@tanstack/react-start';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { formatBRL, parseBRL } from '@/lib/finance/money';
import { REVENUE_CATEGORIES, lateCharges, todayBR, type RevenueEntry, type RevenueContract, type RevenueSource } from '@/lib/finance/revenue';
import { createRevenue, editRevenue, createRevenueContract, receiveRevenue, adjustRevenue, uploadRevenueFile } from '@/lib/finance/revenue.functions';
import { fileToBase64, validateAttachmentFile } from '@/lib/finance/files';
import { ContractForm } from './ContractForm';

export function Field({ label, children }: { label: string; children: ReactNode }) { return <label className="block space-y-1.5 text-sm font-medium"><span>{label}</span>{children}</label>; }
export function Choice({ label, value, onChange, options }: { label: string; value: string; onChange: (v:string)=>void; options: readonly string[] }) {
  return <div className="space-y-1.5"><Label>{label}</Label><Select value={value} onValueChange={onChange}><SelectTrigger aria-label={label} className="w-full"><SelectValue /></SelectTrigger><SelectContent>{options.map(v=><SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent></Select></div>;
}
export function FileInput({ onChange }: { onChange: (files: File[])=>void }) { return <Field label="Arquivos (PDF, JPEG, PNG ou WEBP)"><Input type="file" multiple accept=".pdf,.jpg,.jpeg,.png,.webp" onChange={e=>onChange(Array.from(e.target.files ?? []))} /></Field>; }
export async function uploadFiles(fn: ReturnType<typeof useServerFn<typeof uploadRevenueFile>>, files: File[], entryId:string|null, contractId:string|null) {
  for (const file of files) {
    const error = validateAttachmentFile(file); if (error) throw new Error(error);
    await fn({ data: { entryId, contractId, name:file.name, mime:file.type as 'application/pdf'|'image/jpeg'|'image/png'|'image/webp', base64:await fileToBase64(file) } });
  }
}
function validateFiles(files:File[]) { for (const file of files) { const error=validateAttachmentFile(file); if (error) throw new Error(error); } }
export function NewRevenueDialog({ onClose, onSaved, month, contractOnly=false, editing }: { onClose:()=>void; onSaved:()=>void; month:string; contractOnly?:boolean; editing?:RevenueSource }) {
  const details = editing?.details && typeof editing.details === 'object' && !Array.isArray(editing.details) ? editing.details : {};
  const detail = (key: string) => typeof details[key] === 'string' ? details[key] as string : '';
  const [category,setCategory] = useState<string>(editing?.category ?? (contractOnly?'Crediário':'Salário'));
  const [title,setTitle] = useState(editing?.title ?? ''); const [value,setValue] = useState(editing ? (editing.expected_cents/100).toFixed(2).replace('.',',') : '');
  const [due,setDue] = useState(editing?.first_due ?? `${month}-05`); const [recurring,setRecurring] = useState(editing?.recurring ?? true);
  const [buyer,setBuyer] = useState(''); const [cpf,setCpf] = useState(''); const [rg,setRg] = useState('');
  const [count,setCount] = useState(detail('installments') || '12'); const [interest,setInterest] = useState('0'); const [fine,setFine] = useState('0');
  const [index,setIndex] = useState('Sem correção'); const [other,setOther] = useState('');
  const [source,setSource] = useState(detail('source')); const [benefit,setBenefit] = useState(detail('benefit')); const [original,setOriginal] = useState(detail('original'));
  const [notes,setNotes] = useState(detail('notes')); const [files,setFiles] = useState<File[]>([]); const [busy,setBusy] = useState(false);
  const create = useServerFn(createRevenue); const edit = useServerFn(editRevenue); const contract = useServerFn(createRevenueContract); const upload = useServerFn(uploadRevenueFile);
  const isContract=category==='Crediário';
  async function save(e:React.FormEvent) {
    e.preventDefault(); const cents=parseBRL(value); if (!cents) { toast.error('Informe um valor válido.'); return; }
    setBusy(true);
    try {
      validateFiles(files);
      if (isContract) {
        const { id } = await contract({ data:{ title,buyer,cpf,rg,total_cents:cents,down_payment_cents:0,mode:'count',amount:Number(count),remainderAt:'first',address:'',postal_code:'',city:'',state:'',phone:'',email:'',note:notes,first_due:due,interest_percent:Number(interest.replace(',','.')),fine_percent:Number(fine.replace(',','.')),correction_index:index==='Outro'?other:index } });
        try { await uploadFiles(upload,files,null,id); } catch (error) { toast.error(`Contrato salvo, mas os arquivos não foram anexados: ${(error as Error).message}`); }
      } else {
        if (category==='Benefício' && (!source.trim() || !benefit.trim())) throw new Error('Informe fonte e número do benefício.');
        if (category==='Empréstimo Devolvido' && (!source.trim() || !original)) throw new Error('Informe de quem e a data original do empréstimo.');
        const data = {title,category:category as typeof REVENUE_CATEGORIES[number],expected_cents:cents,first_due:due,recurring:category==='Empréstimo Devolvido'?true:recurring,details:{source,benefit,original,notes,installments:count}};
        if (editing) await edit({ data: { ...data, id: editing.id } });
        else {
          const { id } = await create({ data });
          try { await uploadFiles(upload,files,id,null); } catch(error) { toast.error(`Receita salva, mas os arquivos não foram anexados: ${(error as Error).message}`); }
        }
      }
      toast.success(editing?'Receita atualizada.':isContract?'Contrato cadastrado.':'Receita cadastrada.'); onSaved(); onClose();
    } catch(error) { toast.error((error as Error).message); } finally { setBusy(false); }
  }
  if(contractOnly)return <ContractForm month={month} onClose={onClose} onSaved={onSaved} />;
  return <Dialog open onOpenChange={o=>!o&&!busy&&onClose()}><DialogContent className="max-h-[90dvh] max-w-2xl overflow-y-auto"><DialogHeader><DialogTitle>{editing?'Editar Receita':isContract?'Novo contrato — venda parcelada':'Nova Receita'}</DialogTitle><DialogDescription>{editing?'Recebimentos confirmados serão preservados.':isContract?'Dados da venda e do comprador':'Lançamento previsto'}</DialogDescription></DialogHeader>
    <form onSubmit={save} className="space-y-4">
      {!contractOnly&&<Choice label="Categoria" value={category} onChange={v=>{setCategory(v);setRecurring(v==='Salário');}} options={REVENUE_CATEGORIES.filter(v=>v!=='Crediário')} />}
      <Field label="Fonte de renda / descrição"><Input required maxLength={200} value={title} onChange={e=>setTitle(e.target.value)} /></Field>
      {isContract&&<><Field label="Nome do comprador"><Input required value={buyer} onChange={e=>setBuyer(e.target.value)} /></Field><div className="grid gap-4 sm:grid-cols-2"><Field label="CPF"><Input value={cpf} onChange={e=>setCpf(e.target.value)} /></Field><Field label="RG"><Input value={rg} onChange={e=>setRg(e.target.value)} /></Field></div></>}
      <div className="grid gap-4 sm:grid-cols-2"><Field label={isContract?'Valor total do contrato (R$)':'Valor previsto (R$)'}><Input required inputMode="decimal" value={value} onChange={e=>setValue(e.target.value)} placeholder="0,00" /></Field><Field label={isContract?'Primeiro vencimento':'Vencimento previsto'}><Input required type="date" value={due} onChange={e=>setDue(e.target.value)} /></Field></div>
      {!isContract&&<label className="flex items-center gap-2 text-sm"><Checkbox checked={recurring} onCheckedChange={v=>setRecurring(v===true)} />Repetição mensal</label>}
      {category==='Benefício'&&<div className="grid gap-4 sm:grid-cols-2"><Field label="Fonte do benefício"><Input required value={source} onChange={e=>setSource(e.target.value)} /></Field><Field label="Número do benefício"><Input required value={benefit} onChange={e=>setBenefit(e.target.value)} /></Field></div>}
      {category==='Empréstimo Devolvido'&&<div className="grid gap-4 sm:grid-cols-2"><Field label="De quem"><Input required value={source} onChange={e=>setSource(e.target.value)} /></Field><Field label="Data original do empréstimo"><Input required type="date" value={original} onChange={e=>setOriginal(e.target.value)} /></Field><Field label="Número de parcelas"><Input type="number" min="1" value={count} onChange={e=>setCount(e.target.value)} /></Field></div>}
      {category==='Outros Rendimentos'&&<Field label="Fonte vinculada"><Input value={source} onChange={e=>setSource(e.target.value)} /></Field>}
      {isContract&&<><div className="grid gap-4 sm:grid-cols-3"><Field label="Número de parcelas"><Input required type="number" min="1" max="600" value={count} onChange={e=>setCount(e.target.value)} /></Field><Field label="Juros (% ao mês)"><Input required inputMode="decimal" value={interest} onChange={e=>setInterest(e.target.value)} /></Field><Field label="Multa por atraso (%)"><Input required inputMode="decimal" value={fine} onChange={e=>setFine(e.target.value)} /></Field></div><Choice label="Correção monetária" value={index} onChange={setIndex} options={['Sem correção','IGPM','IPCA','Outro']} />{index==='Outro'&&<Field label="Nome do índice"><Input required value={other} onChange={e=>setOther(e.target.value)} /></Field>}<FileInput onChange={setFiles} /></>}
      <Field label="Observação"><Textarea value={notes} onChange={e=>setNotes(e.target.value)} maxLength={1000} /></Field>
      {!isContract&&!editing&&<FileInput onChange={setFiles} />}
      <div className="flex justify-end gap-2"><Button type="button" variant="outline" disabled={busy} onClick={onClose}>Cancelar</Button><Button type="submit" variant="brand" disabled={busy}>{busy?'Salvando…':'Salvar'}</Button></div>
    </form></DialogContent></Dialog>;
}

export function ReceiveDialog({ entry,onClose,onSaved }: {entry:RevenueEntry;onClose:()=>void;onSaved:()=>void}) {
  const adjusted=entry.adjustment && typeof entry.adjustment==='object' && !Array.isArray(entry.adjustment) ? entry.adjustment['agreed'] : null;
  const [date,setDate]=useState(entry.received_date??todayBR()); const [value,setValue]=useState(((entry.received_cents??(typeof adjusted==='number'?adjusted:entry.expected_cents))/100).toFixed(2).replace('.',','));
  const [note,setNote]=useState(entry.note); const [reason,setReason]=useState(''); const [files,setFiles]=useState<File[]>([]); const [busy,setBusy]=useState(false);
  const receive=useServerFn(receiveRevenue); const upload=useServerFn(uploadRevenueFile);
  const cents=parseBRL(value); const diff=cents===null?0:cents-entry.expected_cents;
  async function save(e:React.FormEvent) {e.preventDefault(); if(cents===null) {toast.error('Informe um valor válido.');return;} setBusy(true);
    try { validateFiles(files); await receive({data:{id:entry.id,date,cents,note,reason}});
      try {await uploadFiles(upload,files,entry.id,null);} catch(error) {toast.error(`Recebimento registrado; comprovante pendente: ${(error as Error).message}`);}
      toast.success(entry.received_date?'Correção registrada no histórico.':'Recebimento registrado.');onSaved();onClose();
    }catch(error){toast.error((error as Error).message);}finally{setBusy(false);}
  }
  return <Dialog open onOpenChange={o=>!o&&!busy&&onClose()}><DialogContent className="max-h-[90dvh] overflow-y-auto"><DialogHeader><DialogTitle>{entry.received_date?'Corrigir recebimento':'Registrar Recebimento'}</DialogTitle><DialogDescription>{entry.title}</DialogDescription></DialogHeader><form onSubmit={save} className="space-y-4">
    <div className="flex justify-between text-sm"><span>Valor previsto</span><strong>{formatBRL(entry.expected_cents)}</strong></div>
    <Field label="Data de recebimento"><Input required type="date" max={todayBR()} value={date} onChange={e=>setDate(e.target.value)} /></Field><Field label="Valor efetivo (R$)"><Input required inputMode="decimal" value={value} onChange={e=>setValue(e.target.value)} /></Field>
    {cents!==null&&<div className={`text-sm ${diff<0?'text-destructive':diff>0?'text-success':'text-muted-foreground'}`}>{diff===0?'Conforme previsto':`${diff>0?'+':'−'}${formatBRL(Math.abs(diff))} — valor ${diff>0?'superior':'inferior'} ao previsto`}</div>}
    <FileInput onChange={setFiles} /><Field label="Observação"><Textarea value={note} onChange={e=>setNote(e.target.value)} maxLength={2000} /></Field>
    {entry.received_date&&<Field label="Motivo da correção"><Textarea required value={reason} onChange={e=>setReason(e.target.value)} maxLength={1000} /></Field>}
    <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={onClose} disabled={busy}>Cancelar</Button><Button type="submit" variant="brand" disabled={busy}>{busy?'Salvando…':'Confirmar'}</Button></div></form></DialogContent></Dialog>;
}

export function AdjustmentDialog({entry,contract,onClose,onSaved,onDocument}:{entry:RevenueEntry;contract:RevenueContract;onClose:()=>void;onSaved:()=>void;onDocument:(text:string)=>void}) {
  const [date,setDate]=useState(todayBR()); const [rate,setRate]=useState('0'); const [agreed,setAgreed]=useState(''); const [note,setNote]=useState('');const [doc,setDoc]=useState(true); const [busy,setBusy]=useState(false);
  const adjust=useServerFn(adjustRevenue); const charges=lateCharges(entry.expected_cents,entry.due_date,date,contract.interest_percent,contract.fine_percent,Number(rate.replace(',','.'))||0);
  async function save(e:React.FormEvent){e.preventDefault();const cents=agreed?parseBRL(agreed):charges.total;if(!cents){toast.error('Valor acordado inválido');return;}setBusy(true);try{
    await adjust({data:{id:entry.id,adjustment:{date,original:entry.expected_cents,...charges,agreed:cents,note}}});onSaved();onClose();
    if(doc)onDocument(`ATUALIZAÇÃO DE PARCELA\n${contract.title}\nComprador: ${contract.buyer}\nCPF: ${contract.cpf} · RG: ${contract.rg}\nParcela: ${entry.number} · Vencimento: ${entry.due_date}\nData prevista de recebimento: ${date}\nOriginal: ${formatBRL(entry.expected_cents)}\nJuros (${contract.interest_percent}% a.m., ${charges.days} dias): ${formatBRL(charges.interestCents)}\nMulta (${contract.fine_percent}%): ${formatBRL(charges.fineCents)}\nCorreção (${contract.correction_index}, ${rate}% informado): ${formatBRL(charges.correctionCents)}\nAtualizado: ${formatBRL(charges.total)}\nAcordado: ${formatBRL(cents)}\n${note}\n\nAssinatura do comprador: _________________________\nAssinatura do credor: _________________________`);
    toast.success('Atualização registrada.');
  }catch(error){toast.error((error as Error).message);}finally{setBusy(false);}}
  return <Dialog open onOpenChange={o=>!o&&!busy&&onClose()}><DialogContent className="max-h-[90dvh] overflow-y-auto"><DialogHeader><DialogTitle>Parcela em atraso — atualização de valor</DialogTitle><DialogDescription>{entry.title} · Parcela {entry.number}</DialogDescription></DialogHeader><form onSubmit={save} className="space-y-4"><Field label="Data prevista de recebimento"><Input required type="date" min={entry.due_date} value={date} onChange={e=>setDate(e.target.value)} /></Field>
    {contract.correction_index!=='Sem correção'&&<Field label={`Correção acumulada ${contract.correction_index} (%) — taxa informada`}><Input required inputMode="decimal" value={rate} onChange={e=>setRate(e.target.value)} /></Field>}
    <dl className="space-y-2 text-sm">{[['Valor original',entry.expected_cents],[`Juros (${charges.days} dias)`,charges.interestCents],['Multa',charges.fineCents],['Correção monetária',charges.correctionCents],['Atualizado a receber',charges.total]].map(([label,val])=><div key={label} className="flex justify-between gap-2"><dt>{label}</dt><dd className="font-semibold">{formatBRL(Number(val))}</dd></div>)}</dl>
    <Field label="Valor acordado com comprador (R$)"><Input inputMode="decimal" value={agreed} placeholder={(charges.total/100).toFixed(2).replace('.',',')} onChange={e=>setAgreed(e.target.value)} /></Field><Field label="Observação"><Textarea value={note} onChange={e=>setNote(e.target.value)} /></Field><label className="flex items-center gap-2 text-sm"><Checkbox checked={doc} onCheckedChange={v=>setDoc(v===true)} />Gerar documento de atualização</label><div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={onClose}>Cancelar</Button><Button variant="brand" disabled={busy}>Confirmar atualização</Button></div></form></DialogContent></Dialog>;
}