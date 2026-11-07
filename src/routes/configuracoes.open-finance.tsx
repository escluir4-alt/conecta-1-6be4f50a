import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { KeyRound, ShieldCheck, Eye, EyeOff, ArrowLeft, Save, Landmark, Plus } from "lucide-react";
import { toast } from "sonner";
import { AppShell, useRequireUser } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getCredentialStatus, updateCredentials, createConnectToken, saveItem, type PluggySlot } from "@/lib/pluggy.functions";

export const Route=createFileRoute("/configuracoes/open-finance")({
  ssr:false,
  head:()=>({meta:[{title:"Configurações Open Finance — Axion"}]}),
  component:OpenFinanceSettings,
});

declare global {
 interface Window { PluggyConnect?: new(options:Record<string,unknown>)=>{init:()=>void}; }
}
function loadPluggyConnect() {
 return new Promise<void>((resolve,reject)=>{
  if(window.PluggyConnect){resolve();return;}
  const existing=document.querySelector('script[data-axion-pluggy]');
  if(existing){existing.addEventListener("load",()=>resolve(),{once:true});existing.addEventListener("error",()=>reject(new Error("Falha ao carregar Pluggy Connect")),{once:true});return;}
  const script=document.createElement("script");
  script.src="https://cdn.pluggy.ai/pluggy-connect/v2.8.2/pluggy-connect.js";
  script.dataset.axionPluggy="true";
  script.onload=()=>resolve();
  script.onerror=()=>reject(new Error("Falha ao iniciar Pluggy Connect"));
  document.body.appendChild(script);
 });
}
function PluggyCredentials({slot}:{slot:PluggySlot}) {
 const client=useQueryClient();
 const getStatus=useServerFn(getCredentialStatus);
 const save=useServerFn(updateCredentials);
 const getToken=useServerFn(createConnectToken);
 const saveConnection=useServerFn(saveItem);
 const status=useQuery({queryKey:["pluggy-credential-status",slot],queryFn:()=>getStatus({data:{slot}})});
 const [clientId,setClientId]=useState("");
 const [secret,setSecret]=useState("");
 const [show,setShow]=useState(false);
 const [saving,setSaving]=useState(false);
 const [connecting,setConnecting]=useState(false);
 useEffect(()=>{if(status.data)setClientId(status.data.clientId);},[status.data?.clientId]);
 const submit=async(e:React.FormEvent)=>{
  e.preventDefault();
  if(!clientId.trim()||!secret.trim()){toast.error("Informe Client ID e Client Secret.");return;}
  setSaving(true);
  try {
   await save({data:{slot,clientId:clientId.trim(),clientSecret:secret.trim()}});
   setSecret("");setShow(false);
   await Promise.all([client.invalidateQueries({queryKey:["pluggy-credential-status",slot]}),client.invalidateQueries({queryKey:["finances"]})]);
   toast.success("Credenciais validadas e salvas com segurança.");
  } catch(err) {toast.error(err instanceof Error?err.message:"Não foi possível salvar.");}
  finally {setSaving(false);}
 };
 const connect=async()=>{
  setConnecting(true);
  try{
   const [token]=await Promise.all([getToken({data:{slot}}),loadPluggyConnect()]);
   const widget=new window.PluggyConnect!({
    connectToken:token.connectToken,
    includeSandbox:true,
    onSuccess:async(data:{item:{id:string;connector?:{name?:string}}})=>{
     try{
      await saveConnection({data:{itemId:data.item.id,connectorName:data.item.connector?.name??"",slot}});
      await client.invalidateQueries({queryKey:["finances"]});
      toast.success("Banco conectado ao Meu Pluggy "+(slot==="primary"?"01":"02")+".");
     }catch(error){toast.error(error instanceof Error?error.message:"Não foi possível salvar a conexão.");}
    },
    onError:()=>toast.error("Conexão bancária não concluída."),
   });
   widget.init();
  }catch(error){toast.error(error instanceof Error?error.message:"Não foi possível conectar o banco.");}
  finally{setConnecting(false);}
 };
 return <form onSubmit={e=>void submit(e)} className="space-y-5 rounded-3xl border border-border/60 bg-card p-5 shadow-soft sm:p-7">
  <div className="flex flex-wrap items-center justify-between gap-3">
   <div className="flex items-center gap-3"><div className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary"><Landmark className="size-5"/></div>
    <div><h2 className="text-lg font-bold">Meu Pluggy {slot==="primary"?"01":"02"}</h2><p className="text-xs text-muted-foreground">{slot==="primary"?"Aplicação principal · conexões existentes preservadas":"Segunda aplicação · credenciais independentes"}</p></div></div>
   <span className="rounded-full bg-muted px-3 py-1 text-xs font-semibold">{status.isLoading?"Verificando…":status.data?.configured?"Credenciais cadastradas":"Não configurado"}</span>
  </div>
  {status.error&&<p role="alert" className="text-sm text-destructive">{(status.error as Error).message}</p>}
  <div className="space-y-2">
   <Label htmlFor={`client-id-${slot}`}>Client ID</Label>
   <Input id={`client-id-${slot}`} autoComplete="off" value={clientId} maxLength={100} onChange={e=>setClientId(e.target.value)} placeholder="Client ID do aplicativo Pluggy" />
  </div>
  <div className="space-y-2">
   <Label htmlFor={`client-secret-${slot}`}>Client Secret</Label>
   <div className="flex gap-2">
    <Input id={`client-secret-${slot}`} autoComplete="new-password" type={show?"text":"password"} maxLength={200} value={secret} onChange={e=>setSecret(e.target.value)} placeholder={status.data?.secretHint?"Novo segredo (atual "+status.data.secretHint+")":"Cole o Client Secret"} />
    <Button type="button" size="icon" variant="outline" onClick={()=>setShow(x=>!x)} aria-label={show?"Ocultar Client Secret":"Mostrar Client Secret"}>{show?<EyeOff className="size-4"/>:<Eye className="size-4"/>}</Button>
   </div>
   <p className="text-xs text-muted-foreground">O segredo existente nunca é exibido. Para alterar, informe o novo Client Secret. Os dados são validados na Pluggy pelo servidor antes do salvamento.</p>
  </div>
  <Button variant="brand" type="submit" disabled={saving||status.isLoading||!!status.error||!secret.trim()||!clientId.trim()}>
   <Save className="size-4"/>{saving?"Validando…":"Validar e salvar credenciais"}
  </Button>
  <div className="border-t border-border/50 pt-4">
   <Button type="button" variant="outline" disabled={connecting||!status.data?.configured} onClick={()=>void connect()}><Plus className="size-4"/>{connecting?"Abrindo Pluggy…":"Adicionar banco ou cartão nesta conexão"}</Button>
   {!status.data?.configured&&<p className="mt-2 text-xs text-muted-foreground">Cadastre primeiro as credenciais dessa aplicação.</p>}
  </div>
 </form>;
}
function OpenFinanceSettings(){
 const user=useRequireUser();
 return <AppShell active="perfil" user={user}><div className="mx-auto max-w-4xl space-y-6 p-5 sm:p-8">
  <div className="flex items-center gap-3">
   <Link to="/perfil" className="grid size-9 place-items-center rounded-xl border hover:bg-muted" aria-label="Voltar ao perfil"><ArrowLeft className="size-4"/></Link>
   <div><p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Configurações / Integrações</p><h1 className="text-3xl font-bold">Open Finance</h1></div>
  </div>
  <div className="flex items-start gap-3 rounded-2xl border border-primary/15 bg-primary/5 p-4 text-sm">
   <ShieldCheck className="mt-0.5 size-5 shrink-0 text-primary"/><p>Gerencie dois aplicativos Meu Pluggy independentes. Os bancos já conectados continuam no Meu Pluggy 01. As credenciais são processadas apenas no servidor; os cartões e extratos das duas origens aparecem juntos na Carteira.</p>
  </div>
  <PluggyCredentials slot="primary"/>
  <PluggyCredentials slot="secondary"/>
  <p className="flex items-center gap-2 text-xs text-muted-foreground"><KeyRound className="size-4"/>Não cole suas chaves em conversas. Utilize somente estes campos protegidos.</p>
 </div></AppShell>;
}
