import { createFileRoute } from "@tanstack/react-router";
import { AppShell, useRequireUser } from "@/components/AppShell";
import { useEffect, useMemo, useState } from "react";
import { ArrowDownUp, Bell, ExternalLink, Heart, Search, ShieldCheck, SlidersHorizontal, Tag, Trash2 } from "lucide-react";

export const Route = createFileRoute("/ofertas")({
  head: () => ({ meta: [{ title: "Ofertas Inteligentes — Axion" }] }),
  component: OfertasPage,
});

type Offer = {
  id: string; title: string; store: string; category: string; price: number; previous: number;
  shipping: number; coupon: number; cashback: number; url: string; reference: "anunciado" | "historico";
  checkedAt: string;
};
type PriceAlert = { id: string; target: number };
type Sort = "discount" | "price" | "saving" | "recent";

const brl = (value: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
const discount = (o: Offer) => o.previous > 0 && o.previous > o.price ? (1 - o.price / o.previous) * 100 : 0;
const finalPrice = (o: Offer) => Math.max(0, o.price + o.shipping - Math.min(o.coupon, o.price) - Math.min(o.cashback, o.price));
const demo: Offer[] = [
  { id:"demo-01", title:"Fone de ouvido Bluetooth", store:"Loja de demonstração A", category:"Eletrônicos", price:89.90, previous:299.90, shipping:0, coupon:0, cashback:0, url:"", reference:"anunciado", checkedAt:"" },
  { id:"demo-02", title:"Cafeteira elétrica", store:"Loja de demonstração B", category:"Casa", price:139.90, previous:349.90, shipping:15, coupon:10, cashback:0, url:"", reference:"anunciado", checkedAt:"" },
  { id:"demo-03", title:"Mochila para notebook", store:"Loja de demonstração C", category:"Acessórios", price:79.90, previous:199.90, shipping:0, coupon:5, cashback:0, url:"", reference:"anunciado", checkedAt:"" },
  { id:"demo-04", title:"Smartwatch esportivo", store:"Loja de demonstração A", category:"Eletrônicos", price:169.90, previous:399.90, shipping:0, coupon:0, cashback:0, url:"", reference:"anunciado", checkedAt:"" },
  { id:"demo-05", title:"Kit de panelas", store:"Loja de demonstração B", category:"Casa", price:219.90, previous:449.90, shipping:19, coupon:20, cashback:0, url:"", reference:"anunciado", checkedAt:"" },
  { id:"demo-06", title:"Tênis para caminhada", store:"Loja de demonstração C", category:"Moda", price:119.90, previous:259.90, shipping:0, coupon:0, cashback:0, url:"", reference:"anunciado", checkedAt:"" },
];

function readSaved<T>(key: string, fallback: T): T {
  try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) as T : fallback; } catch { return fallback; }
}
function OfertasPage() {
  const user = useRequireUser();
  const key = "axion:ofertas:" + (user?.email || "aguardando");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("Todas");
  const [minDiscount, setMinDiscount] = useState(0);
  const [sort, setSort] = useState<Sort>("discount");
  const [onlyFavorites, setOnlyFavorites] = useState(false);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [alerts, setAlerts] = useState<PriceAlert[]>([]);
  const [ready, setReady] = useState(false);
  const [editingAlert, setEditingAlert] = useState<string | null>(null);
  const [target, setTarget] = useState("");
  useEffect(() => {
    if (!user?.email) { setReady(false); return; }
    const saved = readSaved<{ favorites?: string[]; alerts?: PriceAlert[] }>(key, {});
    setFavorites(Array.isArray(saved.favorites) ? saved.favorites.filter((v): v is string => typeof v === "string") : []);
    setAlerts(Array.isArray(saved.alerts) ? saved.alerts.filter((v): v is PriceAlert => typeof v?.id === "string" && Number.isFinite(v?.target)) : []);
    setReady(true);
  }, [user?.email, key]);
  function save(f: string[], a: PriceAlert[]) {
    setFavorites(f); setAlerts(a); localStorage.setItem(key, JSON.stringify({ favorites: f, alerts: a }));
  }
  const categories = ["Todas", ...new Set(demo.map(o => o.category))];
  const filtered = useMemo(() => demo.filter(o =>
    (category === "Todas" || o.category === category) &&
    (o.title + " " + o.store).toLocaleLowerCase("pt-BR").includes(search.toLocaleLowerCase("pt-BR").trim()) &&
    discount(o) >= minDiscount &&
    (!onlyFavorites || favorites.includes(o.id))
  ).sort((a,b) => sort === "discount" ? discount(b) - discount(a) :
    sort === "price" ? finalPrice(a) - finalPrice(b) :
    sort === "saving" ? (b.previous - b.price) - (a.previous - a.price) : a.id.localeCompare(b.id)), [search, category, minDiscount, sort, onlyFavorites, favorites]);
  function toggleFavorite(id: string) {
    save(favorites.includes(id) ? favorites.filter(v => v !== id) : [...favorites, id], alerts);
  }
  function saveAlert(id: string) {
    const n = Number(target.replace(",", "."));
    if (!Number.isFinite(n) || n <= 0) return;
    save(favorites, [...alerts.filter(a => a.id !== id), { id, target: n }]);
    setEditingAlert(null); setTarget("");
  }
  return <AppShell active="ofertas" user={user}>
    <main className="mx-auto max-w-7xl space-y-7 px-4 py-7 sm:px-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[.2em] text-primary">Axion · Compras inteligentes</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">Ofertas Inteligentes</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">Compare descontos, calcule a economia e acompanhe produtos sem sair do Axion.</p>
        </div>
        <span className="inline-flex items-center gap-2 rounded-full border bg-card px-4 py-2 text-xs font-semibold"><ShieldCheck className="size-4 text-primary" /> Ambiente de demonstração</span>
      </header>
      <section role="status" className="rounded-2xl border border-amber-300/60 bg-amber-50 px-5 py-4 text-sm text-amber-950">
        <strong>Preços ilustrativos — não são promoções reais.</strong> Nenhuma loja está conectada. Os descontos exibidos abaixo são apenas exemplos de interface e cálculo. O histórico de preços e a verificação automática funcionarão quando forem integradas fontes autorizadas.
      </section>
      <section className="grid gap-3 md:grid-cols-3">
        <div className="rounded-2xl border bg-card p-5"><p className="text-xs text-muted-foreground">Ofertas demonstrativas</p><p className="mt-2 text-3xl font-bold">{demo.length}</p></div>
        <div className="rounded-2xl border bg-card p-5"><p className="text-xs text-muted-foreground">Maior desconto ilustrativo</p><p className="mt-2 text-3xl font-bold text-primary">{Math.max(...demo.map(discount)).toFixed(0)}%</p></div>
        <div className="rounded-2xl border bg-card p-5"><p className="text-xs text-muted-foreground">Produtos favoritos</p><p className="mt-2 text-3xl font-bold">{ready ? favorites.length : "—"}</p></div>
      </section>
      <section className="space-y-4 rounded-3xl border bg-card p-5 shadow-sm">
        <div className="flex items-center gap-2 font-semibold"><SlidersHorizontal className="size-4 text-primary" /> Buscar e filtrar ofertas</div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="relative sm:col-span-2"><Search className="pointer-events-none absolute left-3 top-3 size-4 text-muted-foreground" /><span className="sr-only">Buscar produto ou loja</span><input className="w-full rounded-xl border bg-background py-2.5 pl-10 pr-3 text-sm" placeholder="Produto, marca ou loja..." value={search} onChange={e=>setSearch(e.target.value)} /></label>
          <label className="flex flex-col gap-1 text-xs text-muted-foreground"><span>Categoria</span><select className="rounded-xl border bg-background p-2.5 text-sm text-foreground" value={category} onChange={e=>setCategory(e.target.value)}>{categories.map(c=><option key={c}>{c}</option>)}</select></label>
          <label className="flex flex-col gap-1 text-xs text-muted-foreground"><span>Ordenar por</span><select className="rounded-xl border bg-background p-2.5 text-sm text-foreground" value={sort} onChange={e=>setSort(e.target.value as Sort)}><option value="discount">Maior desconto (%)</option><option value="saving">Maior economia (R$)</option><option value="price">Menor preço final</option><option value="recent">Mais recentes</option></select></label>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
          <label className="flex items-center gap-2"><Tag className="size-4 text-primary" />Desconto mínimo <select className="rounded-lg border bg-background px-2 py-1.5" value={minDiscount} onChange={e=>setMinDiscount(Number(e.target.value))}>{[0,20,30,40,50,60,70,80,90].map(n=><option key={n} value={n}>{n}%</option>)}</select></label>
          <label className="flex items-center gap-2"><input type="checkbox" checked={onlyFavorites} onChange={e=>setOnlyFavorites(e.target.checked)} /> Apenas favoritos</label>
          <span className="text-muted-foreground">{filtered.length} resultado(s) ilustrativo(s)</span>
        </div>
      </section>
      <section>
        <div className="mb-4 flex items-center gap-2"><ArrowDownUp className="size-4 text-primary" /><h2 className="text-xl font-semibold">Ranking de descontos</h2></div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map(o => {
            const favorite = favorites.includes(o.id);
            const alert = alerts.find(a => a.id === o.id);
            return <article key={o.id} className="flex flex-col overflow-hidden rounded-3xl border bg-card shadow-sm">
              <div className="flex items-start justify-between gap-2 bg-muted/40 p-5">
                <div><span className="rounded-lg bg-primary px-3 py-1 text-sm font-bold text-primary-foreground">-{discount(o).toFixed(0)}%</span><p className="mt-3 text-xs text-muted-foreground">{o.category} · {o.store}</p></div>
                <button type="button" disabled={!ready} onClick={()=>toggleFavorite(o.id)} aria-label={favorite?"Remover dos favoritos":"Adicionar aos favoritos"} className="rounded-full border bg-background p-2" title="Favoritar"><Heart className={favorite?"size-5 fill-red-500 text-red-500":"size-5"} /></button>
              </div>
              <div className="flex flex-1 flex-col gap-3 p-5">
                <h3 className="min-h-12 text-base font-bold">{o.title}</h3>
                <p className="text-xs text-muted-foreground">Preço de referência anunciado: <span className="line-through">{brl(o.previous)}</span></p>
                <p className="text-3xl font-extrabold tracking-tight">{brl(o.price)}</p>
                <p className="text-sm font-semibold text-primary">Economia anunciada: {brl(o.previous-o.price)}</p>
                <div className="rounded-xl bg-muted/50 p-3 text-xs leading-6"><p>Frete: {o.shipping ? brl(o.shipping) : "Grátis"} · Cupom ilustrativo: {brl(o.coupon)}</p><p className="font-bold">Total calculado: {brl(finalPrice(o))}</p><p className="text-muted-foreground">Desconto histórico: não verificado</p></div>
                {alert ? <div className="flex items-center justify-between gap-2 rounded-xl border p-3 text-xs"><span><Bell className="mr-1 inline size-3.5" /> Meta salva: {brl(alert.target)}</span><button onClick={()=>save(favorites,alerts.filter(a=>a.id!==o.id))} aria-label="Excluir alerta"><Trash2 className="size-4" /></button></div> : null}
                {editingAlert===o.id ? <form onSubmit={e=>{e.preventDefault();saveAlert(o.id)}} className="flex gap-2"><input aria-label="Preço alvo em reais" inputMode="decimal" className="min-w-0 flex-1 rounded-xl border bg-background px-3 py-2 text-sm" placeholder="Preço alvo R$" value={target} onChange={e=>setTarget(e.target.value)} /><button className="rounded-xl bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground">Salvar</button></form> : null}
                <div className="mt-auto flex gap-2 pt-2"><button disabled={!ready} onClick={()=>{setEditingAlert(editingAlert===o.id?null:o.id);setTarget(alert?.target.toString() || "")}} className="flex flex-1 items-center justify-center gap-1 rounded-xl border px-3 py-2.5 text-xs font-semibold"><Bell className="size-4" /> Alerta de preço</button><button disabled className="flex flex-1 items-center justify-center gap-1 rounded-xl bg-muted px-3 py-2.5 text-xs font-semibold text-muted-foreground" title="Disponível após conexão de lojas">Ver oferta <ExternalLink className="size-4" /></button></div>
              </div>
            </article>;
          })}
        </div>
        {filtered.length===0 && <div className="rounded-2xl border border-dashed p-10 text-center text-sm text-muted-foreground">Nenhuma oferta demonstrativa corresponde aos filtros.</div>}
      </section>
      <section className="rounded-3xl border bg-card p-6"><h2 className="text-lg font-bold">Fontes e integrações</h2><p className="mt-2 text-sm text-muted-foreground">Mercado Livre, Amazon, Magalu, Casas Bahia, KaBuM! e Shopee: <strong>não conectados</strong>. Para ofertas verdadeiras, o sistema precisará de feeds ou APIs autorizadas. Nunca informe senhas ou chaves nesta página. Não há monitoramento automático nem notificações de alerta nesta versão; as metas ficam salvas neste navegador.</p></section>
    </main>
  </AppShell>;
}
