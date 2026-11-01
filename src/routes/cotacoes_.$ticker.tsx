import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft } from "lucide-react";
import { useState } from "react";
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AppShell, useRequireUser } from "@/components/AppShell";
import { stockName } from "@/lib/finance/b3";
import { getStockHistory } from "@/lib/finance/stocks.functions";
import { brl, Change } from "@/components/finance/Change";

export const Route = createFileRoute("/cotacoes_/$ticker")({
  ssr: false,
  head: ({ params }) => ({
    meta: [
      { title: `${params.ticker} — Bolsa de Valores` },
      { name: "description", content: `Cotação e gráfico de ${params.ticker} em tempo real.` },
      { property: "og:title", content: `${params.ticker} — Bolsa de Valores` },
      { property: "og:description", content: `Cotação e gráfico de ${params.ticker} em tempo real.` },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: StockDetail,
});

const RANGES = [
  { id: "1d", label: "Hoje" }, { id: "5d", label: "5 dias" }, { id: "1mo", label: "1 mês" }, { id: "6mo", label: "6 meses" },
] as const;

function StockDetail() {
  const user = useRequireUser();
  const { ticker } = Route.useParams();
  const symbol = ticker.toUpperCase();
  const fn = useServerFn(getStockHistory);
  const [range, setRange] = useState<(typeof RANGES)[number]["id"]>("1d");
  const q = useQuery({
    queryKey: ["stock-history", symbol, range],
    queryFn: () => fn({ data: { symbol, range } }),
    refetchInterval: range === "1d" ? 5_000 : 60_000,
  });
  const d = q.data;
  const pts = d?.points ?? [];
  const first = pts[0]?.p ?? 0;
  const periodChange = range === "1d" ? d?.changePercent ?? 0 : first && d ? ((d.price - first) / first) * 100 : 0;
  const up = periodChange >= 0;
  const fmtT = (t: number) => range === "1d" || range === "5d"
    ? new Date(t).toLocaleString("pt-BR", range === "1d" ? { hour: "2-digit", minute: "2-digit" } : { day: "2-digit", month: "2-digit", hour: "2-digit" })
    : new Date(t).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });

  return (
    <AppShell active="cotacoes" user={user}>
      <div className="mx-auto max-w-3xl px-4 py-6">
        <Link to="/cotacoes" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="size-4" />Bolsa de Valores</Link>
        <div className="mb-5 flex items-center gap-3">
          <div className="flex size-12 items-center justify-center rounded-full bg-primary/10 font-bold text-primary">{symbol.slice(0, 2)}</div>
          <div className="flex-1">
            <span className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">Ação · {symbol}</span>
            <div className="font-medium">{stockName(symbol)}</div>
          </div>
          <div className="text-right">
            <div className="text-xl font-bold">{d ? brl(d.price) : "—"}</div>
            <Change value={periodChange} />
          </div>
        </div>

        <div className="mb-4 flex gap-1 overflow-x-auto">
          {RANGES.map((r) => (
            <button key={r.id} onClick={() => setRange(r.id)} className={`rounded-full px-4 py-2 text-sm font-semibold ${range === r.id ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-muted"}`}>{r.label}</button>
          ))}
        </div>

        <div className="h-80 rounded-2xl border bg-card p-2">
          {q.isLoading ? <div className="flex h-full items-center justify-center text-sm text-muted-foreground">Carregando gráfico…</div>
            : !d || !pts.length ? <div className="flex h-full items-center justify-center text-sm text-muted-foreground">Gráfico indisponível para {symbol}.</div>
            : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={pts}>
                  <XAxis dataKey="t" tickFormatter={fmtT} minTickGap={40} tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" />
                  <YAxis domain={["auto", "auto"]} hide />
                  <Tooltip labelFormatter={(t) => fmtT(Number(t))} formatter={(v) => [brl(Number(v)), "Preço"]} />
                  <Line type="linear" dataKey="p" dot={false} strokeWidth={2} stroke={up ? "var(--success)" : "var(--destructive)"} isAnimationActive={false} />
                </LineChart>
              </ResponsiveContainer>
            )}
        </div>

        {d && (
          <div className="mt-4 grid grid-cols-3 gap-3 text-sm">
            <Info label="Fech. anterior" value={brl(d.previousClose)} />
            <Info label="Máxima do dia" value={brl(d.high)} />
            <Info label="Mínima do dia" value={brl(d.low)} />
          </div>
        )}
      </div>
    </AppShell>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl border bg-card p-3"><div className="text-xs text-muted-foreground">{label}</div><div className="font-semibold">{value}</div></div>;
}
