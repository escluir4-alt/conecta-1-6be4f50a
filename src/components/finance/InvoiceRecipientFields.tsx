import { useEffect,useState } from 'react';
import { useServerFn } from '@tanstack/react-start';
import { toast } from 'sonner';
import { Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select,SelectContent,SelectItem,SelectTrigger,SelectValue } from '@/components/ui/select';
import { BRAZIL_STATES,savedRecipientSchema,type PixRecipient } from '@/lib/finance/pix-recipient';
import { getInvoiceRecipient,saveInvoiceRecipient,getRecipientCities } from '@/lib/finance/recipient.functions';

export function InvoiceRecipientFields({value,onChange}:{value:PixRecipient;onChange:(v:PixRecipient)=>void}){
  const load=useServerFn(getInvoiceRecipient);const save=useServerFn(saveInvoiceRecipient);const getCities=useServerFn(getRecipientCities);
  const [cities,setCities]=useState<string[]>([]);const [busy,setBusy]=useState(false);const [loading,setLoading]=useState(false);
  useEffect(()=>{let active=true;void load().then(r=>{if(active&&r)onChange(r);}).catch(e=>toast.error(e.message));return()=>{active=false;};},[load]);
  useEffect(()=>{let active=true;setLoading(true);void getCities({data:{state:value.state}}).then(r=>{if(active)setCities(r);}).catch(e=>{if(active){setCities([]);toast.error(e.message);}}).finally(()=>{if(active)setLoading(false);});return()=>{active=false;};},[value.state,getCities]);
  async function persist(){const parsed=savedRecipientSchema.safeParse(value);if(!parsed.success){toast.error('Preencha chave Pix, nome, estado e cidade.');return;}setBusy(true);try{await save({data:parsed.data});toast.success('Recebedor salvo.');}catch(e){toast.error((e as Error).message);}finally{setBusy(false);}}
  return <div className="space-y-3"><h2 className="font-bold">Recebedor Pix</h2><label className="block space-y-1.5 text-sm">Chave Pix<Input maxLength={77} value={value.key} onChange={e=>onChange({...value,key:e.target.value})}/></label><label className="block space-y-1.5 text-sm">Nome completo do recebedor<Input maxLength={200} value={value.name} onChange={e=>onChange({...value,name:e.target.value})}/></label><div className="grid gap-3 sm:grid-cols-[100px_1fr]"><div className="space-y-1.5 text-sm"><label htmlFor="recipient-state">Estado</label><Select value={value.state} onValueChange={state=>onChange({...value,state:state as PixRecipient['state'],city:state==='DF'?'Brasília':''})}><SelectTrigger id="recipient-state" aria-label="Estado do recebedor"><SelectValue/></SelectTrigger><SelectContent>{BRAZIL_STATES.map(s=><SelectItem value={s} key={s}>{s}</SelectItem>)}</SelectContent></Select></div><label className="space-y-1.5 text-sm">Cidade do recebedor<Input list="recipient-cities" maxLength={200} value={value.city} placeholder={loading?'Carregando cidades…':'Selecionar ou digitar cidade'} onChange={e=>onChange({...value,city:e.target.value})}/><datalist id="recipient-cities">{cities.map(c=><option value={c} key={c}/>)}</datalist></label></div><Button variant="outline" disabled={busy} onClick={persist}><Save/>{busy?'Salvando…':'Salvar recebedor'}</Button></div>;
}