import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const AWESOME_API_BASE = "https://economia.awesomeapi.com.br";
const DEFAULT_CURRENCY_PAIRS = ["USD-BRL", "EUR-BRL", "GBP-BRL", "JPY-BRL", "BTC-BRL", "ETH-BRL"];

export type CurrencyQuote = {
  pair: string;
  code: string;
  codein: string;
  name: string;
  high: number;
  low: number;
  varBid: number;
  pctChange: number;
  bid: number;
  ask: number;
  timestamp: string;
  create_date: string;
};

export type StockQuote = {
  symbol: string;
  name: string;
  price: number;
  open: number;
  high: number;
  low: number;
  close: number;
  change_percent: number;
};

function asNumber(value: string | number | null | undefined): number {
  const normalized = typeof value === "string" ? value.replace(",", ".") : value;
  const parsed = Number(normalized ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizePairs(input?: string[] | string | null): string[] {
  const source = Array.isArray(input) ? input : typeof input === "string" ? input.split(",") : DEFAULT_CURRENCY_PAIRS;
  const normalized = source
    .map((pair) => String(pair ?? "").trim().toUpperCase())
    .filter(Boolean)
    .filter((pair, index, arr) => arr.indexOf(pair) === index);

  return normalized.length > 0 ? normalized : DEFAULT_CURRENCY_PAIRS;
}

function normalizeTicker(ticker: string): string {
  return String(ticker ?? "").trim().toLowerCase();
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, {
    headers: { Accept: "application/json" },
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`Falha na API de cotações (${res.status})`);
  }

  return (await res.json()) as T;
}

export const getCurrencyQuote = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z
      .object({
        pair: z.string().trim().min(1).max(20).default("USD-BRL"),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    const pair = String(data.pair ?? "USD-BRL").trim().toUpperCase();
    const payload = await fetchJson<Record<string, any>>(`${AWESOME_API_BASE}/json/last/${pair}`);
    const quote = payload?.[pair] ?? null;

    if (!quote) {
      throw new Error(`Par de moeda não encontrado: ${pair}`);
    }

    return {
      pair,
      code: quote.code,
      codein: quote.codein,
      name: quote.name,
      high: asNumber(quote.high),
      low: asNumber(quote.low),
      varBid: asNumber(quote.varBid),
      pctChange: asNumber(quote.pctChange),
      bid: asNumber(quote.bid),
      ask: asNumber(quote.ask),
      timestamp: quote.timestamp,
      create_date: quote.create_date,
    } satisfies CurrencyQuote;
  });

export const getCurrencyQuotes = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z
      .object({
        pairs: z.array(z.string().trim().min(1).max(20)).optional(),
      })
      .parse(data ?? {}),
  )
  .handler(async ({ data }) => {
    const pairs = normalizePairs(data?.pairs);
    const payload = await fetchJson<Record<string, any>>(`${AWESOME_API_BASE}/json/last/${pairs.join(",")}`);

    return pairs
      .map((pair) => {
        const quote = payload?.[pair] ?? null;
        if (!quote) return null;
        return {
          pair,
          code: quote.code,
          codein: quote.codein,
          name: quote.name,
          high: asNumber(quote.high),
          low: asNumber(quote.low),
          varBid: asNumber(quote.varBid),
          pctChange: asNumber(quote.pctChange),
          bid: asNumber(quote.bid),
          ask: asNumber(quote.ask),
          timestamp: quote.timestamp,
          create_date: quote.create_date,
        } satisfies CurrencyQuote;
      })
      .filter(Boolean) as CurrencyQuote[];
  });

function mapAwesome(payload: Record<string, any>, pairs: string[]): CurrencyQuote[] {
  return pairs
    .map((pair) => {
      const quote = payload?.[pair.replace("-", "")] ?? payload?.[pair];
      if (!quote) return null;
      return {
        pair,
        code: quote.code,
        codein: quote.codein,
        name: quote.name,
        high: asNumber(quote.high),
        low: asNumber(quote.low),
        varBid: asNumber(quote.varBid),
        pctChange: asNumber(quote.pctChange),
        bid: asNumber(quote.bid),
        ask: asNumber(quote.ask),
        timestamp: quote.timestamp,
        create_date: quote.create_date,
      } satisfies CurrencyQuote;
    })
    .filter(Boolean) as CurrencyQuote[];
}

function makeQuote(pair: string, bid: number, pctChange: number, date: string): CurrencyQuote {
  const [code = "", codein = "BRL"] = pair.split("-");
  return {
    pair, code, codein, name: `${code}/${codein}`,
    high: bid, low: bid, varBid: 0, pctChange, bid, ask: bid,
    timestamp: String(Math.floor(Date.now() / 1000)), create_date: date,
  };
}

async function fallbackCurrencies(pairs: string[]): Promise<CurrencyQuote[]> {
  const out: CurrencyQuote[] = [];
  const now = new Date().toISOString();
  const fiat = pairs.filter((p) => !p.startsWith("BTC") && !p.startsWith("ETH")).map((p) => p.split("-")[0]);
  const [fx, crypto] = await Promise.allSettled([
    fetchJson<{ rates: Record<string, number>; date: string }>(
      `https://api.frankfurter.dev/v1/latest?base=BRL&symbols=${fiat.join(",")}`,
    ),
    fetchJson<Record<string, { brl: number; brl_24h_change: number }>>(
      "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum&vs_currencies=brl&include_24hr_change=true",
    ),
  ]);
  for (const pair of pairs) {
    const code = pair.split("-")[0] ?? "";
    if (code === "BTC" || code === "ETH") {
      if (crypto.status !== "fulfilled") continue;
      const c = crypto.value[code === "BTC" ? "bitcoin" : "ethereum"];
      if (c) out.push(makeQuote(pair, c.brl, c.brl_24h_change ?? 0, now));
    } else if (fx.status === "fulfilled") {
      const rate = fx.value.rates?.[code];
      if (rate) out.push(makeQuote(pair, 1 / rate, 0, fx.value.date));
    }
  }
  return out;
}

export const getCurrencySnapshot = createServerFn({ method: "GET" }).handler(async () => {
  const pairs = DEFAULT_CURRENCY_PAIRS;
  try {
    const payload = await fetchJson<Record<string, any>>(`${AWESOME_API_BASE}/json/last/${pairs.join(",")}`);
    const mapped = mapAwesome(payload, pairs);
    if (mapped.length) return { pairs: mapped, error: null as string | null };
  } catch (e) {
    console.error("AwesomeAPI falhou, usando fallback:", e);
  }
  try {
    const fb = await fallbackCurrencies(pairs);
    return { pairs: fb, error: fb.length ? null : "Câmbio indisponível no momento." };
  } catch (e) {
    console.error("Fallback de câmbio falhou:", e);
    return { pairs: [] as CurrencyQuote[], error: "Câmbio indisponível no momento." };
  }
});

export const getAvailableCurrencyPairs = createServerFn({ method: "GET" }).handler(async () => {
  return { pairs: [...DEFAULT_CURRENCY_PAIRS] };
});

export const getStockQuote = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z
      .object({
        ticker: z.string().trim().min(1).max(20),
        exchange: z.string().trim().min(1).max(20).default("B3SA"),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    const exchange = String(data.exchange ?? "B3SA").trim().toUpperCase();
    const ticker = normalizeTicker(data.ticker);
    const payload = await fetchJson<any[]>(`${AWESOME_API_BASE}/stock/${exchange}/${ticker}`);
    const quote = Array.isArray(payload) ? payload[0] : payload;

    if (!quote) {
      throw new Error(`Ação não encontrada: ${ticker}`);
    }

    return {
      symbol: quote.symbol,
      name: quote.name,
      price: asNumber(quote.price),
      open: asNumber(quote.open),
      high: asNumber(quote.high),
      low: asNumber(quote.low),
      close: asNumber(quote.close),
      change_percent: asNumber(quote.change_percent),
    } satisfies StockQuote;
  });

export const getStockQuotes = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z
      .object({
        tickers: z.array(z.string().trim().min(1).max(20)).min(1),
        exchange: z.string().trim().min(1).max(20).default("B3SA"),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    const tickers = [...new Set(data.tickers.map((t) => t.trim().toUpperCase()))].slice(0, 10);
    const results = await Promise.allSettled(
      tickers.map((t) => fetchJson<{ results?: any[] }>(`https://brapi.dev/api/quote/${encodeURIComponent(t)}`)),
    );
    return results.flatMap((r) => {
      const q = r.status === "fulfilled" ? r.value.results?.[0] : null;
      if (!q) return [];
      return [{
        symbol: q.symbol,
        name: q.longName ?? q.shortName ?? q.symbol,
        price: asNumber(q.regularMarketPrice),
        open: asNumber(q.regularMarketOpen),
        high: asNumber(q.regularMarketDayHigh),
        low: asNumber(q.regularMarketDayLow),
        close: asNumber(q.regularMarketPreviousClose),
        change_percent: asNumber(q.regularMarketChangePercent),
      } satisfies StockQuote];
    });
  });

export const getMarketQuotes = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z
      .object({
        currencyPairs: z.array(z.string().trim().min(1).max(20)).optional(),
        stockTickers: z.array(z.string().trim().min(1).max(20)).optional(),
        exchange: z.string().trim().min(1).max(20).default("B3SA"),
      })
      .parse(data ?? {}),
  )
  .handler(async ({ data }) => {
    const currencyPairs = normalizePairs(data?.currencyPairs);
    const stockTickers = (data?.stockTickers ?? []).map((ticker) => normalizeTicker(ticker));

    const [currencyQuotes, stockQuotes] = await Promise.all([
      fetchJson<Record<string, any>>(`${AWESOME_API_BASE}/json/last/${currencyPairs.join(",")}`),
      stockTickers.length > 0 ? fetchJson<any[]>(`${AWESOME_API_BASE}/stock/${String(data.exchange ?? "B3SA").trim().toUpperCase()}/${stockTickers.join(",")}`) : Promise.resolve([]),
    ]);

    const currencies = currencyPairs
      .map((pair) => {
        const quote = currencyQuotes?.[pair];
        if (!quote) return null;
        return {
          pair,
          code: quote.code,
          codein: quote.codein,
          name: quote.name,
          high: asNumber(quote.high),
          low: asNumber(quote.low),
          varBid: asNumber(quote.varBid),
          pctChange: asNumber(quote.pctChange),
          bid: asNumber(quote.bid),
          ask: asNumber(quote.ask),
          timestamp: quote.timestamp,
          create_date: quote.create_date,
        } satisfies CurrencyQuote;
      })
      .filter(Boolean) as CurrencyQuote[];

    const stocks = (Array.isArray(stockQuotes) ? stockQuotes : [stockQuotes])
      .filter(Boolean)
      .map((quote) => ({
        symbol: quote.symbol,
        name: quote.name,
        price: asNumber(quote.price),
        open: asNumber(quote.open),
        high: asNumber(quote.high),
        low: asNumber(quote.low),
        close: asNumber(quote.close),
        change_percent: asNumber(quote.change_percent),
      } satisfies StockQuote));

    return { currencies, stocks };
  });

export const marketQuoteDefaults = {
  currencyPairs: DEFAULT_CURRENCY_PAIRS,
  stockTickers: ["PETR4", "VALE3", "ITUB4"],
  exchange: "B3SA",
};

export default {
  getCurrencyQuote,
  getCurrencyQuotes,
  getCurrencySnapshot,
  getAvailableCurrencyPairs,
  getStockQuote,
  getStockQuotes,
  getMarketQuotes,
  marketQuoteDefaults,
};
