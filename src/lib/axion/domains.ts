export function marketIntent(question: string) {
  if (/\bselic\b/i.test(question)) return { kind: "selic" } as const;
  const tickers = [...new Set(question.toUpperCase().match(/\b[A-Z]{4}[0-9]{1,2}\b/g) ?? [])];
  return tickers.length ? { kind: "stocks", tickers: tickers.slice(0, 5) } as const : null;
}
