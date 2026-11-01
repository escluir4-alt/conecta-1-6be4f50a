import { useState } from 'react';
import { useServerFn } from '@tanstack/react-start';
import { Plus, Star, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { AGENDA_KINDS, type PersonalKind, type PersonalRecord } from '@/lib/finance/agenda-personal';
import { savePersonalAgenda, deletePersonalAgenda } from '@/lib/finance/agenda.functions';
import { parseBRL } from '@/lib/finance/money';

export function AgendaForm({date, initial, onClose, onSaved}: {date:string; initial?:PersonalRecord; onClose:()=>void; onSaved:()=>Promise<void>}) {
  const [kind,setKind] = useState<PersonalKind>(initial?.kind ?? 'appointment');
  const [title,setTitle] = useState(initial?.title ?? '');
  const [start,setStart] = useState(initial?.start_date ?? date);
  const [time,setTime] = useState(initial?.time ?? '');
  const [description,setDescription] = useState(initial?.description ?? '');
  const [recurrence,setRecurrence] = useState(initial?.recurrence ?? 'none');
  const [favorite,setFavorite] = useState(initial?.favorite ?? false);
  const [reminder,setReminder] = useState(initial?.reminder ?? true);
  const [rows,setRows] = useState((initial?.items ?? []).map(it => ({...it, price:(it.cents/100).toFixed(2).replace('.',',')})));
  const [busy,setBusy] = useState(false), [error,setError] = useState('');
  const save = useServerFn(savePersonalAgenda), remove = useServerFn(deletePersonalAgenda);
  const list = kind === 'tasks' || kind === 'shopping';
  async function submit(e:React.FormEvent) {
    e.preventDefault(); setError('');
    const items = rows.map(r => ({key:r.key,description:r.description,quantity:Number(r.quantity),cents:kind === 'shopping' ? parseBRL(r.price) : 0}));
    if (list && (!items.length || items.some(i => !i.description.trim() || i.cents === null || i.quantity <= 0))) {setError('Preencha os itens e seus valores.');return;}
    setBusy(true);
    try { await save({data:{id:initial?.id,kind,title,start_date:start,time,description,recurrence:kind === 'birthday' ? 'yearly' : kind === 'work' ? '12x36' : recurrence,favorite,reminder:!list && kind !== 'work' && reminder,items:items.map(i => ({...i,cents:i.cents ?? 0}))}}); await onSaved(); onClose(); }
    catch {setError('Não foi possível salvar. Tente novamente.');} finally {setBusy(false);}
  }
  return <Dialog open onOpenChange={open => {if (!open) onClose();}}><DialogContent className="max-h-[85dvh] overflow-y-auto"><DialogHeader><DialogTitle>{initial ? 'Editar' : 'Adicionar à agenda'}</DialogTitle><DialogDescription>{date.split('-').reverse().join('/')}</DialogDescription></DialogHeader>
    <form onSubmit={submit} className="space-y-4">
      <div className="space-y-2"><Label>Tipo</Label><Select value={kind} onValueChange={v => setKind(v as PersonalKind)}><SelectTrigger aria-label="Tipo de atividade"><SelectValue /></SelectTrigger><SelectContent>{Object.entries(AGENDA_KINDS).map(([value,label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent></Select></div>
      <div className="space-y-2"><Label htmlFor="agenda-title">{kind === 'birthday' ? 'Nome' : kind === 'work' ? 'Trabalho / local' : 'Título'}</Label><Input id="agenda-title" required maxLength={200} value={title} onChange={e => setTitle(e.target.value)} /></div>
      <div className="grid grid-cols-2 gap-3"><div className="min-w-0 space-y-2"><Label htmlFor="agenda-date">{kind === 'work' ? 'Primeiro plantão' : kind === 'birthday' ? 'Data de aniversário' : 'Data'}</Label><Input className="min-w-0" id="agenda-date" type="date" required value={start} onChange={e => setStart(e.target.value)} /></div>{kind !== 'birthday' && <div className="min-w-0 space-y-2"><Label htmlFor="agenda-time">{kind === 'work' ? 'Início do plantão' : 'Hora'}</Label><Input id="agenda-time" type="time" value={time} onChange={e => setTime(e.target.value)} /></div>}</div>
      {kind === 'work' ? <p className="text-sm font-semibold">Escala 12×36 · 12 horas de plantão, 36 horas de descanso</p> : kind !== 'birthday' && !list && <div className="space-y-2"><Label>Periodicidade</Label><Select value={recurrence} onValueChange={setRecurrence}><SelectTrigger aria-label="Periodicidade"><SelectValue /></SelectTrigger><SelectContent>{[['none','Não repete'],['daily','Diária'],['weekly','Semanal'],['monthly','Mensal'],['yearly','Anual']].map(([value,label]) => <SelectItem key={value} value={value ?? 'none'}>{label}</SelectItem>)}</SelectContent></Select></div>}
      {!list && <div className="space-y-2"><Label htmlFor="agenda-description">Descrição</Label><Textarea id="agenda-description" maxLength={2000} value={description} onChange={e => setDescription(e.target.value)} /></div>}
      {!list && kind !== 'work' && <div className="space-y-2"><div className="flex items-center justify-between"><Label className="flex items-center gap-2"><Checkbox checked={reminder} onCheckedChange={v => setReminder(v === true)} />Lembrete</Label><Button type="button" variant="ghost" size="icon" aria-label="Favoritar lembrete" title="Favoritar lembrete" aria-pressed={favorite} onClick={() => setFavorite(!favorite)}><Star className={favorite ? 'fill-primary text-primary' : ''} /></Button></div>{reminder && <p className="text-xs text-muted-foreground">{favorite ? '15, 7, 3 e 1 dias antes e no dia.' : 'No próprio dia.'}</p>}</div>}
      {list && <div className="space-y-3">{rows.map((row,index) => <div key={row.key} className="space-y-2 border-b pb-3"><div className="flex gap-2"><Input aria-label={`Descrição do item ${index+1}`} placeholder="Descrição" required value={row.description} onChange={e => setRows(rows.map(r => r.key === row.key ? {...r,description:e.target.value} : r))} /><Button type="button" variant="ghost" size="icon" aria-label={`Remover item ${index+1}`} onClick={() => setRows(rows.filter(r => r.key !== row.key))}><Trash2 className="size-4" /></Button></div>{kind === 'shopping' && <div className="grid grid-cols-2 gap-2"><div><Label>Quantidade</Label><Input aria-label={`Quantidade do item ${index+1}`} type="number" min="0.01" step="any" value={row.quantity} onChange={e => setRows(rows.map(r => r.key === row.key ? {...r,quantity:Number(e.target.value)} : r))} /></div><div><Label>Valor previsto (R$)</Label><Input aria-label={`Valor previsto do item ${index+1}`} inputMode="decimal" value={row.price} onChange={e => setRows(rows.map(r => r.key === row.key ? {...r,price:e.target.value} : r))} /></div></div>}</div>)}<Button type="button" variant="outline" onClick={() => setRows([...rows,{key:crypto.randomUUID(),description:'',quantity:1,cents:0,price:'0,00'}])}><Plus className="size-4" />Item</Button></div>}
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <div className="flex justify-between gap-2">{initial ? <Button disabled={busy} variant="destructive" type="button" onClick={async () => {if (!window.confirm('Excluir este registro e todas as suas ocorrências?')) return;setBusy(true);try {await remove({data:{id:initial.id}});await onSaved();onClose();}catch {setError('Não foi possível excluir.');setBusy(false);}}}><Trash2 className="size-4" />Excluir</Button> : <span />}<Button disabled={busy} type="submit">{busy ? 'Salvando…' : 'Salvar'}</Button></div>
    </form></DialogContent></Dialog>;
}