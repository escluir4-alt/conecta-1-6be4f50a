export const B3_STOCKS: { symbol: string; name: string }[] = [
  { symbol: "PETR4", name: "Petrobras" }, { symbol: "VALE3", name: "Vale" }, { symbol: "ITUB4", name: "Itaú Unibanco" },
  { symbol: "BPAC11", name: "Banco BTG Pactual" }, { symbol: "PETR3", name: "Petrobras" }, { symbol: "BBDC4", name: "Bradesco" },
  { symbol: "BBAS3", name: "Banco do Brasil" }, { symbol: "B3SA3", name: "B3" }, { symbol: "ITSA4", name: "Itaúsa" },
  { symbol: "ABEV3", name: "Ambev" }, { symbol: "WEGE3", name: "WEG" }, { symbol: "RENT3", name: "Localiza" },
  { symbol: "SUZB3", name: "Suzano" }, { symbol: "GGBR4", name: "Gerdau" }, { symbol: "PRIO3", name: "PRIO" },
  { symbol: "RADL3", name: "Raia Drogasil" }, { symbol: "LREN3", name: "Lojas Renner" }, { symbol: "MGLU3", name: "Magazine Luiza" },
  { symbol: "BBSE3", name: "BB Seguridade" }, { symbol: "SANB11", name: "Santander Brasil" }, { symbol: "EQTL3", name: "Equatorial" },
  { symbol: "CSNA3", name: "CSN" }, { symbol: "USIM5", name: "Usiminas" }, { symbol: "EMBR3", name: "Embraer" },
  { symbol: "VIVT3", name: "Vivo" }, { symbol: "TIMS3", name: "TIM" }, { symbol: "CMIG4", name: "Cemig" },
  { symbol: "SBSP3", name: "Sabesp" }, { symbol: "HAPV3", name: "Hapvida" }, { symbol: "RAIL3", name: "Rumo" },
  { symbol: "CSAN3", name: "Cosan" }, { symbol: "UGPA3", name: "Ultrapar" }, { symbol: "TOTS3", name: "Totvs" },
  { symbol: "KLBN11", name: "Klabin" }, { symbol: "CPLE6", name: "Copel" }, { symbol: "CYRE3", name: "Cyrela" },
  { symbol: "AZUL4", name: "Azul" }, { symbol: "COGN3", name: "Cogna" }, { symbol: "NTCO3", name: "Natura" },
  { symbol: "BRFS3", name: "BRF" },
];

export const stockName = (s: string) => B3_STOCKS.find((x) => x.symbol === s)?.name ?? s;

export function suggestStocks(q: string, limit = 8) {
  const t = q.trim().toUpperCase();
  if (!t) return [];
  return B3_STOCKS.filter((s) => s.symbol.startsWith(t) || s.name.toUpperCase().includes(t)).slice(0, limit);
}
