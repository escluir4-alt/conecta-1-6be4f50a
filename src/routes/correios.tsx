import { createFileRoute } from "@tanstack/react-router";
import { AppShell, useRequireUser } from "@/components/AppShell";
import { useState } from "react";
import { Package, MapPin, Calculator, Search, ExternalLink, ShieldCheck, Clock3, Settings2 } from "lucide-react";

export const Route = createFileRoute("/correios")({ component: CorreiosPage });

type Address = { cep: string; logradouro: string; complemento?: string; bairro: string; localidade: string; uf: string; erro?: boolean };
const clean = (value: string) => value.replace(/\D/g, "");

function CorreiosPage() {
  const user = useRequireUser();
  const [cep, setCep] = useState("");
  const [address, setAddress] = useState<Address | null>(null);
  const [cepError, setCepError] = useState("");
  const [loading, setLoading] = useState(false);
  const [tracking, setTracking] = useState("");
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");

  async function lookup(e: React.FormEvent) {
    e.preventDefault();
    setCepError(""); setAddress(null);
    if (clean(cep).length !== 8) { setCepError("Informe um CEP com 8 dígitos."); return; }
    setLoading(true);
    try {
      // Consulta pública alternativa; não representa autenticação na API contratual dos Correios.
      const response = await fetch(`https://viacep.com.br/ws/${clean(cep)}/json/`);
      if (!response.ok) throw new Error("Serviço indisponível");
      const data: Address = await response.json();
      if (data.erro) throw new Error("CEP não encontrado");
      setAddress(data);
    } catch (error) { setCepError(error instanceof Error ? error.message : "Falha ao consultar CEP"); }
    finally { setLoading(false); }
  }

  const trackCode = tracking.trim().toUpperCase();
  const trackingValid = /^[A-Z]{2}[0-9]{9}[A-Z]{2}$/.test(trackCode);
  const services = [
    { title: "Rastreamento", detail: "Acompanhamento pelo site oficial enquanto o acesso à API Rastro não estiver autorizado.", icon: Package, status: "Acesso pendente" },
    { title: "Preço do frete", detail: "Integração oficial condicionada ao contrato e à habilitação da API Preço.", icon: Calculator, status: "Acesso pendente" },
    { title: "Prazo de entrega", detail: "Integração oficial condicionada ao contrato e à habilitação da API Prazo.", icon: Clock3, status: "Acesso pendente" },
    { title: "Busca de agências", detail: "Consulta oficial sujeita às permissões da conta Correios.", icon: MapPin, status: "Acesso pendente" },
  ];

  return (
    <AppShell active="correios" user={user}>
    <main className="min-h-screen bg-background text-foreground px-4 py-8 sm:px-8">
      <div className="mx-auto max-w-6xl space-y-7">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div><p className="text-xs font-semibold uppercase tracking-[.2em] text-muted-foreground">Axion · Serviços</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight">Correios</h1>
            <p className="mt-2 text-sm text-muted-foreground">Endereços, encomendas, fretes e entregas em um só lugar.</p></div>

        </div>
        <div className="flex items-start gap-3 rounded-2xl border border-border bg-card p-4 text-sm">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
          <p><strong>Integração em preparação.</strong> A consulta de CEP abaixo utiliza o serviço público ViaCEP. As APIs privadas dos Correios ainda exigem habilitação contratual; nenhuma conexão oficial foi simulada.</p>
        </div>
        <div className="grid gap-5 lg:grid-cols-2">
          <section className="rounded-3xl border border-border bg-card p-6 shadow-sm">
            <div className="flex items-center gap-2"><Search className="h-5 w-5 text-primary" /><h2 className="text-lg font-semibold">Consultar CEP</h2></div>
            <p className="mt-2 text-sm text-muted-foreground">Encontre o endereço pelo CEP, sem necessidade de contrato.</p>
            <form onSubmit={lookup} className="mt-5 flex gap-2">
              <input aria-label="CEP" inputMode="numeric" maxLength={9} placeholder="00000-000" value={cep} onChange={e=>setCep(e.target.value)} className="min-w-0 flex-1 rounded-xl border border-input bg-background px-4 py-3 outline-none focus:ring-2 focus:ring-ring" />
              <button disabled={loading} className="rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-50">{loading ? "Consultando..." : "Buscar"}</button>
            </form>
            {cepError && <p role="alert" className="mt-3 text-sm text-destructive">{cepError}</p>}
            {address && <div className="mt-5 rounded-2xl bg-muted/60 p-4 text-sm leading-7">
              <p className="font-semibold">{address.logradouro || "Logradouro não informado"}</p>
              <p>{address.bairro || "Bairro não informado"} · {address.localidade}/{address.uf}</p>
              <p>CEP {address.cep}</p>
              <button onClick={()=>navigator.clipboard?.writeText(`${address.logradouro}, ${address.bairro}, ${address.localidade} - ${address.uf}, ${address.cep}`)} className="mt-2 text-xs font-semibold text-primary underline">Copiar endereço</button>
            </div>}
          </section>
          <section className="rounded-3xl border border-border bg-card p-6 shadow-sm">
            <div className="flex items-center gap-2"><Package className="h-5 w-5 text-primary" /><h2 className="text-lg font-semibold">Rastrear encomenda</h2></div>
            <p className="mt-2 text-sm text-muted-foreground">Abra a consulta diretamente no ambiente oficial dos Correios.</p>
            <input aria-label="Código de rastreamento" placeholder="AA123456789BR" value={tracking} onChange={e=>setTracking(e.target.value)} className="mt-5 w-full rounded-xl border border-input bg-background px-4 py-3 uppercase outline-none focus:ring-2 focus:ring-ring" />
            {tracking && !trackingValid && <p className="mt-2 text-xs text-muted-foreground">Informe um código postal no formato AA123456789BR.</p>}
            <a href="https://rastreamento.correios.com.br/app/index.php" target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground">Consultar no site oficial <ExternalLink className="h-4 w-4" /></a>
            <p className="mt-3 text-xs text-muted-foreground">O código não é enviado automaticamente; informe-o no portal oficial.</p>
          </section>
          <section className="rounded-3xl border border-border bg-card p-6 shadow-sm lg:col-span-2">
            <div className="flex items-center gap-2"><Calculator className="h-5 w-5 text-primary" /><h2 className="text-lg font-semibold">Simulação de frete e prazo</h2></div>
            <p className="mt-2 text-sm text-muted-foreground">Área preparada para as APIs oficiais de preço e prazo, ainda sem acesso contratual.</p>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <input aria-label="CEP de origem" placeholder="CEP de origem" inputMode="numeric" value={origin} onChange={e=>setOrigin(e.target.value)} className="rounded-xl border border-input bg-background px-4 py-3" />
              <input aria-label="CEP de destino" placeholder="CEP de destino" inputMode="numeric" value={destination} onChange={e=>setDestination(e.target.value)} className="rounded-xl border border-input bg-background px-4 py-3" />
            </div>
            <p className="mt-4 text-xs text-muted-foreground">Nenhum valor ou prazo é estimado sem dados oficiais. CEPs informados: {clean(origin).length === 8 && clean(destination).length === 8 ? "prontos para uma futura consulta autenticada" : "preencha origem e destino"}.</p>
          </section>
        </div>
        <section className="space-y-4"><div className="flex items-center gap-2"><Settings2 className="h-5 w-5 text-primary" /><h2 className="text-lg font-semibold">Serviços e permissões</h2></div>
          <div className="grid gap-3 md:grid-cols-2">{services.map(({title,detail,icon:Icon,status})=><div key={title} className="rounded-2xl border border-border bg-card p-5">
            <div className="flex items-center justify-between gap-3"><Icon className="h-5 w-5 text-primary" /><span className="rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground">{status}</span></div>
            <h3 className="mt-3 font-semibold">{title}</h3><p className="mt-1 text-sm text-muted-foreground">{detail}</p>
          </div>)}</div>
        </section>
        <p className="pb-6 text-xs text-muted-foreground">Credenciais e tokens devem ser armazenados exclusivamente no backend, nunca no navegador. Documentação: <a className="underline" href="https://www.correios.com.br/atendimento/developers" target="_blank" rel="noopener noreferrer">Portal dos Correios</a>.</p>
      </div>
    </main>
    </AppShell>
  );
}
