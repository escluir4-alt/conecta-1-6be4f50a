import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { scanStoreOffers } from "@/lib/offers/scan.functions";
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
  const scan = useServerFn(scanStoreOffers);
  const [storeUrl, setStoreUrl] = useState("");
  const [scanPages, setScanPages] = useState(3);
  const [scanning, setScanning] = useState(false);
  const [scanResults, setScanResults] = useState<Offer[] | null>(null);
  const [scanInfo, setScanInfo] = useState<{ pagesScanned: number; pagesAttempted: number; failedPages: number; productsDetected: number; skippedWithoutDiscount: number; notices: string[]; checkedAt: string; note: string } | null>(null);
  const [scanError, setScanError] = useState("");
  const offers = scanResults ?? demo;
  const live = scanResults !== null;
  async function runScan(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (scanning) return;
    setScanning(true); setScanError(""); setScanInfo(null);
    try {
      const result = await scan({ data: { url: storeUrl.trim(), pages: scanPages } });
      setScanResults(result.offers);
      setCategory("Todas"); setMinDiscount(0); setOnlyFavorites(false); setSearch("");
      setScanInfo({ pagesScanned: result.pagesScanned, pagesAttempted: result.pagesAttempted, failedPages: result.failedPages, productsDetected: result.productsDetected, skippedWithoutDiscount: result.skippedWithoutDiscount, notices: result.notices, checkedAt: result.checkedAt, note: result.note });
    } catch (err) {
      setScanResults(null);
      setScanError(err instanceof Error ? err.message : "Não foi possível verificar o link.");
    } finally { setScanning(false); }
  }
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
  const categories = ["Todas", ...new Set(offers.map(o => o.category))];
  const filtered = useMemo(() => offers.filter(o =>
    (category === "Todas" || o.category === category) &&
    (o.title + " " + o.store).toLocaleLowerCase("pt-BR").includes(search.toLocaleLowerCase("pt-BR").trim()) &&
    discount(o) >= minDiscount &&
    (!onlyFavorites || favorites.includes(o.id))
  ).sort((a,b) => sort === "discount" ? discount(b) - discount(a) :
    sort === "price" ? finalPrice(a) - finalPrice(b) :
    sort === "saving" ? (b.previous - b.price) - (a.previous - a.price) : a.id.localeCompare(b.id)), [offers, search, category, minDiscount, sort, onlyFavorites, favorites]);
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
        <span className="inline-flex items-center gap-2 rounded-full border bg-card px-4 py-2 text-xs font-semibold"><ShieldCheck className="size-4 text-primary" /> {live ? "Varredura pública · valores não verificados" : "Ambiente de demonstração"}</span>
      </header>
      <section className="rounded-3xl border bg-card p-5 shadow-sm sm:p-6">
        <div className="flex items-center gap-2"><Search className="size-5 text-primary" /><h2 className="text-lg font-bold">Varredura por link da loja</h2></div>
        <p className="mt-2 text-sm text-muted-foreground">Cole o endereço de uma loja ou página de promoções. O Axion tenta ler páginas públicas permitidas da loja e, quando houver preços estruturados acessíveis, organiza os produtos pelo maior desconto anunciado, independentemente da categoria.</p>
        <form onSubmit={runScan} className="mt-4 flex flex-wrap items-end gap-3">
          <label className="min-w-64 flex-1 text-xs font-semibold text-muted-foreground">Link HTTPS da loja<input type="url" required placeholder="https://www.loja.com.br/ofertas" className="mt-1 block w-full rounded-xl border bg-background px-4 py-3 text-sm text-foreground" value={storeUrl} onChange={e=>setStoreUrl(e.target.value)} /></label>
          <label className="text-xs font-semibold text-muted-foreground">Máximo de páginas<select value={scanPages} onChange={e=>setScanPages(Number(e.target.value))} className="mt-1 block rounded-xl border bg-background px-3 py-3 text-sm text-foreground">{[1,2,3,4,5].map(n=><option key={n} value={n}>{n}</option>)}</select></label>
          <button disabled={scanning} className="rounded-xl bg-primary px-5 py-3 text-sm font-bold text-primary-foreground disabled:opacity-60">{scanning ? "Analisando..." : "Varrer ofertas"}</button>
        </form>
        <p className="mt-3 text-xs text-muted-foreground">Domínios aceitos para tentativa de leitura (não são integrações oficiais): Mercado Livre, Amazon Brasil, Magalu, Casas Bahia, KaBuM!, Shopee, Americanas, Carrefour, Extra, Ponto, Fast Shop, Renner, Netshoes e Centauro. Algumas podem bloquear a varredura ou carregar preços somente por JavaScript. Limite de 5 páginas por consulta, sem contornar bloqueios.</p>
        {scanError && <p role="alert" className="mt-3 rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{scanError}</p>}
        {scanInfo && <div role="status" className="mt-4 space-y-2 rounded-xl border bg-muted/40 p-4 text-sm"><p className="font-semibold">{scanResults?.length ?? 0} ofertas com desconto calculável · {scanInfo.productsDetected} produto(s) localizado(s) · {scanInfo.pagesScanned} página(s) lida(s)</p><p className="text-xs text-muted-foreground">{scanInfo.note} Consulta: {new Date(scanInfo.checkedAt).toLocaleString("pt-BR")}.</p>{scanInfo.skippedWithoutDiscount>0 && <p className="text-xs text-muted-foreground">{scanInfo.skippedWithoutDiscount} produto(s) desconsiderado(s) porque a loja não informou um preço anterior confiável. Produtos sem desconto não entram no ranking.</p>}{scanInfo.notices.map((message,i)=><p className="text-xs text-amber-700" key={i}>{message}</p>)}{scanResults?.length===0 && <p className="text-xs">{scanInfo.productsDetected > 0 ? "Os produtos encontrados não possuem desconto comprovável nos dados disponibilizados. Nenhum será apresentado como promoção." : scanInfo.failedPages > 0 ? "A leitura da loja foi bloqueada ou falhou. Uma integração oficial de catálogo pode ser necessária." : "Não foi possível encontrar descontos mensuráveis nas páginas acessíveis. Isso não significa que a loja esteja sem promoções."}</p>}</div>}
        {live && <button type="button" className="mt-3 rounded-xl border px-4 py-2 text-xs font-semibold" onClick={()=>{setScanResults(null);setScanInfo(null);setCategory("Todas");}}>Voltar à demonstração</button>}
      </section>
      {!live && <section role="status" className="rounded-2xl border border-amber-300/60 bg-amber-50 px-5 py-4 text-sm text-amber-950">
        <strong>Preços ilustrativos — não são promoções reais.</strong> Nenhuma loja está conectada. Os descontos exibidos abaixo são apenas exemplos de interface e cálculo. O histórico de preços e a verificação automática funcionarão quando forem integradas fontes autorizadas.
      </section>}
      <section className="grid gap-3 md:grid-cols-3">
        <div className="rounded-2xl border bg-card p-5"><p className="text-xs text-muted-foreground">{live ? "Ofertas com desconto" : "Ofertas demonstrativas"}</p><p className="mt-2 text-3xl font-bold">{offers.length}</p></div>
        <div className="rounded-2xl border bg-card p-5"><p className="text-xs text-muted-foreground">{live ? "Maior desconto anunciado encontrado" : "Maior desconto ilustrativo"}</p><p className="mt-2 text-3xl font-bold text-primary">{offers.length ? Math.max(...offers.map(discount)).toFixed(0) + "%" : "—"}</p></div>
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
          <span className="text-muted-foreground">{filtered.length} resultado(s) {live ? "encontrado(s)" : "ilustrativo(s)"}</span>
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
                <div><span className="rounded-lg bg-primary px-3 py-1 text-sm font-bold text-primary-foreground">{o.previous > o.price ? "-" + discount(o).toFixed(0) + "%" : "Sem referência"}</span><p className="mt-3 text-xs text-muted-foreground">{o.category} · {o.store}</p></div>
                <button type="button" disabled={!ready} onClick={()=>toggleFavorite(o.id)} aria-label={favorite?"Remover dos favoritos":"Adicionar aos favoritos"} className="rounded-full border bg-background p-2" title="Favoritar"><Heart className={favorite?"size-5 fill-red-500 text-red-500":"size-5"} /></button>
              </div>
              <div className="flex flex-1 flex-col gap-3 p-5">
                <h3 className="min-h-12 text-base font-bold">{o.title}</h3>
                <p className="text-xs text-muted-foreground">Preço de referência anunciado: <span className="line-through">{o.previous > 0 ? brl(o.previous) : "Não informado"}</span></p>
                <p className="text-3xl font-extrabold tracking-tight">{brl(o.price)}</p>
                <p className="text-sm font-semibold text-primary">{o.previous > 0 ? "Economia anunciada: " + brl(o.previous-o.price) : "Preço anterior não divulgado"}</p>
                <div className="rounded-xl bg-muted/50 p-3 text-xs leading-6"><p>Frete: {live ? "não informado" : o.shipping ? brl(o.shipping) : "Grátis"} · {live ? "Cupom: não informado" : "Cupom ilustrativo: " + brl(o.coupon)}</p><p className="font-bold">{live ? "Preço informado (frete não incluído): " + brl(o.price) : "Total calculado: " + brl(finalPrice(o))}</p><p className="text-muted-foreground">Desconto histórico: não verificado</p></div>
                {alert ? <div className="flex items-center justify-between gap-2 rounded-xl border p-3 text-xs"><span><Bell className="mr-1 inline size-3.5" /> Meta salva: {brl(alert.target)}</span><button onClick={()=>save(favorites,alerts.filter(a=>a.id!==o.id))} aria-label="Excluir alerta"><Trash2 className="size-4" /></button></div> : null}
                {editingAlert===o.id ? <form onSubmit={e=>{e.preventDefault();saveAlert(o.id)}} className="flex gap-2"><input aria-label="Preço alvo em reais" inputMode="decimal" className="min-w-0 flex-1 rounded-xl border bg-background px-3 py-2 text-sm" placeholder="Preço alvo R$" value={target} onChange={e=>setTarget(e.target.value)} /><button className="rounded-xl bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground">Salvar</button></form> : null}
                <div className="mt-auto flex gap-2 pt-2"><button disabled={!ready} onClick={()=>{setEditingAlert(editingAlert===o.id?null:o.id);setTarget(alert?.target.toString() || "")}} className="flex flex-1 items-center justify-center gap-1 rounded-xl border px-3 py-2.5 text-xs font-semibold"><Bell className="size-4" /> Alerta de preço</button>{o.url ? <a href={o.url} target="_blank" rel="noopener noreferrer" className="flex flex-1 items-center justify-center gap-1 rounded-xl bg-primary px-3 py-2.5 text-xs font-semibold text-primary-foreground">Ver oferta <ExternalLink className="size-4" /></a> : <button disabled className="flex flex-1 items-center justify-center gap-1 rounded-xl bg-muted px-3 py-2.5 text-xs font-semibold text-muted-foreground">Exemplo ilustrativo</button>}</div>
              </div>
            </article>;
          })}
        </div>
        {filtered.length===0 && <div className="rounded-2xl border border-dashed p-10 text-center text-sm text-muted-foreground">{live ? "Nenhuma oferta com preço anterior confiável foi identificada nas páginas analisadas. Para o catálogo completo, é necessário integrar um feed ou API autorizada da loja." : "Nenhuma oferta corresponde aos filtros selecionados."}</div>}
      </section>
      <section className="rounded-3xl border bg-card p-6"><h2 className="text-lg font-bold">Fontes e integrações</h2><p className="mt-2 text-sm text-muted-foreground">A varredura de links usa apenas dados HTML estruturados que estejam publicamente disponíveis e autorizados. Conexões via APIs oficiais ou feeds ainda não foram instaladas. Não há monitoramento automático nem notificações de alerta nesta versão; as metas ficam salvas neste navegador.</p></section>
    </main>
  </AppShell>;
}
