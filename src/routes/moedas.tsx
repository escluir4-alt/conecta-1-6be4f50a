import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AppShell, useRequireUser } from "@/components/AppShell";
import { getCurrencySnapshot } from "@/lib/finance/market-quotes";
import { brl, Change } from "@/components/finance/Change";

export const Route = createFileRoute("/moedas")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Moedas — Casa Clara" },
      { name: "description", content: "Cotação de dólar, euro, libra, iene, bitcoin e ethereum em reais." },
      { property: "og:title", content: "Moedas — Casa Clara" },
      { property: "og:description", content: "Cotação de dólar, euro, libra, iene, bitcoin e ethereum em reais." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CurrencyPage,
});

const NAMES: Record<string, string> = { USD: "Dólar americano", EUR: "Euro", GBP: "Libra esterlina", JPY: "Iene", BTC: "Bitcoin", ETH: "Ethereum" };

function CurrencyPage() {
  const user = useRequireUser();
  const fn = useServerFn(getCurrencySnapshot);
  const q = useQuery({ queryKey: ["currencies"], queryFn: () => fn(), refetchInterval: 10_000 });
  const pairs = q.data?.pairs ?? [];
  return (
    <AppShell active="moedas" user={user}>
      <div className="mx-auto max-w-3xl px-4 py-6">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
          <h1 className="text-2xl font-extrabold tracking-tight">Moedas</h1>
          <span className="text-xs text-muted-foreground">Atualiza a cada 10 s{q.dataUpdatedAt ? ` · ${new Date(q.dataUpdatedAt).toLocaleTimeString("pt-BR")}` : ""}</span>
        </div>
        {q.data?.error && <div className="mb-4 rounded-xl border border-destructive/30 bg-danger-soft p-3 text-sm text-destructive">{q.data.error}</div>}
        <div className="rounded-2xl border bg-card p-2 shadow-soft">
          {q.isLoading ? <div className="py-10 text-center text-sm text-muted-foreground">Carregando…</div> : pairs.map((c) => (
            <div key={c.pair} className="flex items-center gap-3 border-b px-3 py-3 last:border-0">
              <div className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">{c.code}</div>
              <div className="flex-1"><div className="font-medium">{NAMES[c.code] ?? c.code}</div><div className="text-xs text-muted-foreground">{c.pair}</div></div>
              <div className="text-right"><div className="font-bold">{brl(c.bid)}</div><Change value={c.pctChange} /></div>
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
