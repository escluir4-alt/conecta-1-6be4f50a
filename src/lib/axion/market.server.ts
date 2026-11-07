import { z } from "zod";
import { loadStockHistory } from "@/lib/finance/stocks.functions";
import { marketIntent } from "./domains";

const selicRow = z.object({ data: z.string().regex(/^\d{2}\/\d{2}\/\d{4}$/), valor: z.string().regex(/^\d+(\.\d+)?$/) });
const stamp = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Sao_Paulo" });

export async function marketAnswer(intent: NonNullable<ReturnType<typeof marketIntent>>) {
  if (intent.kind === "selic") {
    try {
      const response = await fetch("https://api.bcb.gov.br/dados/serie/bcdata.sgs.432/dados/ultimos/1?formato=json", { redirect: "error", signal: AbortSignal.timeout(7000) });
      if (!response.ok) throw new Error();
      const row = z.array(selicRow).length(1).parse(await response.json())[0]!;
      return { text: `Meta Selic: ${Number(row.valor).toLocaleString("pt-BR")}% ao ano. Referência: ${row.data}. Fonte: Banco Central (SGS 432).`, sources: [{ title: "Banco Central — série 432", url: "https://dadosabertos.bcb.gov.br/dataset/432-taxa-de-juros---meta-selic-definida-pelo-copom" }] };
    } catch {
      return { text: "A meta Selic não pôde ser consultada no Banco Central. Nenhum valor foi estimado.", sources: [] };
    }
  }
  const rows = await Promise.allSettled(intent.tickers.map(symbol => loadStockHistory({ symbol, range: "1d" })));
  const lines = rows.map((r, i) => {
    const row = r.status === "fulfilled" ? r.value : null;
    if (!row || !Number.isFinite(row.price) || row.price <= 0 || row.currency !== "BRL") return `${intent.tickers[i]}: cotação em BRL indisponível.`;
    const price = row.price.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
    const at = row.quotedAt && Number.isFinite(row.quotedAt) && Math.abs(row.quotedAt) <= 8.64e15 ? stamp.format(row.quotedAt) + " (Brasília)" : "horário não informado";
    return `${row.symbol}: ${price} · ${at}`;
  });
  return { text: lines.join("\n") + "\nFonte: Yahoo Finance, a mesma consulta de Cotações. O dado pode ter atraso; não é confirmação de preço em tempo real.", sources: [] };
}
