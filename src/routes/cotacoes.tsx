import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Search, TrendingDown, TrendingUp, Star } from "lucide-react";
import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { AppShell, useRequireUser } from "@/components/AppShell";
import { B3_STOCKS, stockName, suggestStocks } from "@/lib/finance/b3";
import { brl, Change } from "@/components/finance/Change";
import { getLiveStocks, type LiveStock } from "@/lib/finance/stocks.functions";

export const Route = createFileRoute("/cotacoes")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Bolsa de Valores — Axion" },
      { name: "description", content: "Ações da B3 em tempo real: destaques, maiores altas e maiores quedas." },
      { property: "og:title", content: "Bolsa de Valores — Axion" },
      { property: "og:description", content: "Ações da B3 em tempo real: destaques, maiores altas e maiores quedas." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: StocksPage,
});

const FEATURED = ["PETR4", "VALE3", "ITUB4", "BPAC11", "PETR3", "BBDC4", "BBAS3", "ITSA4"];
function StockRow({ s }: { s: LiveStock }) {
  return (
    <Link to="/cotacoes/$ticker" params={{ ticker: s.symbol }} className="flex items-center gap-3 rounded-xl px-2 py-3 transition-colors hover:bg-muted/50">
      <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">{s.symbol.slice(0, 2)}</div>
      <div className="min-w-0 flex-1">
        <span className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">Ação · {s.symbol}</span>
        <div className="truncate text-sm font-medium">{stockName(s.symbol)}</div>
      </div>
      <div className="text-right">
        <div className="font-bold">{brl(s.price)}</div>
        <Change value={s.changePercent} />
      </div>
    </Link>
  );
}

function Column({ title, icon: Icon, items, loading }: { title: string; icon: React.ComponentType<{ className?: string }>; items: LiveStock[]; loading: boolean }) {
  return (
    <section className="rounded-2xl border bg-card p-4 shadow-soft">
      <h2 className="mb-2 flex items-center gap-2 text-base font-bold"><Icon className="size-4 text-primary" />{title}</h2>
      {loading ? <div className="py-8 text-center text-sm text-muted-foreground">Carregando…</div>
        : items.length ? items.map((s) => <StockRow key={s.symbol} s={s} />)
        : <div className="py-8 text-center text-sm text-muted-foreground">Sem dados agora.</div>}
    </section>
  );
}

function StocksPage() {
  const user = useRequireUser();
  const fn = useServerFn(getLiveStocks);
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const query = useQuery({
    queryKey: ["live-stocks"],
    queryFn: () => fn({ data: { symbols: B3_STOCKS.map((s) => s.symbol) } }),
    refetchInterval: 5_000,
  });
  const stocks = query.data?.stocks ?? [];
  const featured = useMemo(() => FEATURED.flatMap((f) => stocks.filter((s) => s.symbol === f)), [stocks]);
  const gainers = useMemo(() => [...stocks].filter((s) => s.changePercent > 0).sort((a, b) => b.changePercent - a.changePercent).slice(0, 8), [stocks]);
  const losers = useMemo(() => [...stocks].filter((s) => s.changePercent < 0).sort((a, b) => a.changePercent - b.changePercent).slice(0, 8), [stocks]);
  const suggestions = suggestStocks(q);
  const go = (t: string) => navigate({ to: "/cotacoes/$ticker", params: { ticker: t } });

  return (
    <AppShell active="cotacoes" user={user}>
      <div className="mx-auto max-w-7xl px-4 py-6 lg:px-6">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
          <div className="flex flex-wrap items-center gap-3"><h1 className="text-2xl font-extrabold tracking-tight">Bolsa de Valores</h1><a href="/moedas" className="rounded-lg border px-3 py-2 text-sm font-semibold hover:bg-accent">Moedas</a></div>
          <span className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="size-2 animate-pulse rounded-full bg-success" />Ao vivo · atualiza a cada 5 s
            {query.dataUpdatedAt ? ` · ${new Date(query.dataUpdatedAt).toLocaleTimeString("pt-BR")}` : ""}
          </span>
        </div>

        <div className="relative mb-6">
          <Search className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => { setQ(e.target.value); setOpen(true); }}
            onFocus={() => setOpen(true)}
            onBlur={() => setTimeout(() => setOpen(false), 150)}
            onKeyDown={(e) => { if (e.key === "Enter" && suggestions[0]) go(suggestions[0].symbol); }}
            placeholder="Buscar ação (ex.: PETR4, Itaú)"
            className="h-12 rounded-full pl-11"
            aria-label="Buscar ação"
          />
          {open && suggestions.length > 0 && (
            <ul role="listbox" className="absolute z-20 mt-2 w-full overflow-hidden rounded-xl border bg-popover shadow-lg">
              {suggestions.map((s) => {
                const live = stocks.find((x) => x.symbol === s.symbol);
                return (
                  <li key={s.symbol}>
                    <button type="button" role="option" aria-selected={false} onMouseDown={() => go(s.symbol)} className="flex w-full items-center justify-between px-4 py-2.5 text-left hover:bg-muted">
                      <span><b>{s.symbol}</b> <span className="text-sm text-muted-foreground">{s.name}</span></span>
                      {live && <span className="text-sm">{brl(live.price)} <Change value={live.changePercent} /></span>}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {query.data?.error && <div className="mb-4 rounded-xl border border-destructive/30 bg-danger-soft p-3 text-sm text-destructive">{query.data.error}</div>}

        <div className="grid gap-4 lg:grid-cols-3">
          <Column title="Ações em destaque" icon={Star} items={featured} loading={query.isLoading} />
          <Column title="Maiores altas" icon={TrendingUp} items={gainers} loading={query.isLoading} />
          <Column title="Maiores quedas" icon={TrendingDown} items={losers} loading={query.isLoading} />
        </div>
      </div>
    </AppShell>
  );
}
