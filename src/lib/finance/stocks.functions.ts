import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export type LiveStock = { symbol: string; name: string; price: number; changePercent: number };
export type StockHistory = LiveStock & { high: number; low: number; previousClose: number; points: { t: number; p: number }[] };

const YH = "https://query1.finance.yahoo.com";
const headers = { "User-Agent": "Mozilla/5.0", Accept: "application/json" };
const tick = z.string().trim().toUpperCase().regex(/^[A-Z0-9]{4,7}$/);

function pct(m: any) {
  const prev = Number(m.chartPreviousClose ?? m.previousClose ?? 0);
  const price = Number(m.regularMarketPrice ?? 0);
  return m.regularMarketChangePercent != null ? Number(m.regularMarketChangePercent) : prev ? ((price - prev) / prev) * 100 : 0;
}

export const getLiveStocks = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ symbols: z.array(tick).min(1).max(60) }).parse(d))
  .handler(async ({ data }) => {
    const chunks: string[][] = [];
    for (let i = 0; i < data.symbols.length; i += 20) chunks.push(data.symbols.slice(i, i + 20));
    const res = await Promise.allSettled(
      chunks.map(async (c) => {
        const r = await fetch(`${YH}/v7/finance/spark?symbols=${c.map((s) => `${s}.SA`).join(",")}&range=1d&interval=1d`, { headers });
        if (!r.ok) throw new Error(String(r.status));
        return (await r.json()) as any;
      }),
    );
    const out: LiveStock[] = [];
    for (const r of res) {
      if (r.status !== "fulfilled") { console.error("spark falhou", r.reason); continue; }
      for (const item of r.value?.spark?.result ?? []) {
        const m = item?.response?.[0]?.meta;
        if (!m?.regularMarketPrice) continue;
        out.push({ symbol: String(item.symbol).replace(".SA", ""), name: m.longName ?? m.shortName ?? item.symbol, price: Number(m.regularMarketPrice), changePercent: pct(m) });
      }
    }
    return { stocks: out, error: out.length ? null : "Cotações indisponíveis no momento." };
  });

const RANGES = { "1d": "5m", "5d": "30m", "1mo": "1d", "6mo": "1d" } as const;

export const getStockHistory = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ symbol: tick, range: z.enum(["1d", "5d", "1mo", "6mo"]) }).parse(d))
  .handler(async ({ data }): Promise<StockHistory | null> => {
    const r = await fetch(`${YH}/v8/finance/chart/${data.symbol}.SA?range=${data.range}&interval=${RANGES[data.range]}`, { headers });
    if (!r.ok) { console.error("chart falhou", r.status); return null; }
    const j = (await r.json()) as any;
    const res = j?.chart?.result?.[0];
    if (!res?.meta) return null;
    const m = res.meta;
    const ts: number[] = res.timestamp ?? [];
    const cl: (number | null)[] = res.indicators?.quote?.[0]?.close ?? [];
    const points = ts.flatMap((t, i) => (cl[i] != null ? [{ t: t * 1000, p: Number(cl[i]) }] : []));
    return {
      symbol: data.symbol, name: m.longName ?? m.shortName ?? data.symbol, price: Number(m.regularMarketPrice ?? 0),
      changePercent: pct(m), high: Number(m.regularMarketDayHigh ?? 0), low: Number(m.regularMarketDayLow ?? 0),
      previousClose: Number(m.chartPreviousClose ?? m.previousClose ?? 0), points,
    };
  });
