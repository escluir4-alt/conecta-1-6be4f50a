/**
 * Leitura de NF-e/NFC-e a partir do XML fiscal original.
 * Nenhum OCR, fotografia ou consulta remota é necessário para esta extração.
 * Um XML importado não deve ser anunciado como autenticidade verificada na SEFAZ.
 */
export type ImportedFiscalProduct = {
  description: string;
  quantity: number;
  unit_price_cents: number;
  total_cents: number;
};

export type ImportedFiscalDocument = {
  model: "55" | "65";
  accessKey: string;
  issuer: string;
  issuerCnpj: string;
  issuedOn: string;
  documentNumber: string;
  series: string;
  totalCents: number;
  items: ImportedFiscalProduct[];
  qrCodeUrl?: string;
  protocol?: string;
};

function node(parent: Document | Element | null | undefined, name: string): Element | undefined {
  if (!parent) return undefined;
  return Array.from(parent.getElementsByTagName("*")).find(el => el.localName === name);
}
function direct(parent: Element | undefined, name: string): Element | undefined {
  return parent ? Array.from(parent.children).find(el => el.localName === name) : undefined;
}
function value(parent: Element | undefined, name: string): string {
  return (direct(parent, name)?.textContent ?? "").trim();
}
function cents(raw: string): number {
  if (!/^\d+(?:\.\d{1,10})?$/.test(raw)) throw new Error("Valor monetário inválido no XML");
  const n = Math.round(Number(raw) * 100);
  if (!Number.isSafeInteger(n) || n < 0) throw new Error("Valor fora do limite");
  return n;
}
function required(text: string, label: string): string {
  if (!text) throw new Error(label + " ausente no XML fiscal");
  return text;
}

/** Extrai a chave de 44 dígitos de leitura ótica, URL NFC-e ou entrada manual. */
export function extractFiscalAccessKey(raw: string): string | null {
  const input = raw.trim();
  const matched = input.match(/(?:^|[^\d])(\d{44})(?!\d)/);
  if (!matched) return null;
  const key = matched[1];
  if (!key || !/^\d{44}$/.test(key)) return null;
  const model = key.slice(20,22);
  if (model !== "55" && model !== "65") return null;
  let weight = 2, sum = 0;
  for (let i = 42; i >= 0; i--) {
    sum += Number(key[i]) * weight;
    weight = weight === 9 ? 2 : weight + 1;
  }
  const result = 11 - sum % 11;
  if (Number(key[43]) !== (result >= 10 ? 0 : result)) return null;
  return key;
}

/** Apenas destinos oficiais conhecidos do DF podem ser abertos a partir de um QR. */
export function officialDfQrUrl(raw: string): string | null {
  try {
    const u = new URL(raw.trim());
    const host = u.hostname.toLowerCase();
    if (u.protocol !== "https:" && u.protocol !== "http:") return null;
    if (host !== "fazenda.df.gov.br" && host !== "www.fazenda.df.gov.br") return null;
    if (!/^\/nfce\/qrcode\/?$/i.test(u.pathname)) return null;
    const key = extractFiscalAccessKey(u.searchParams.get("p") ?? u.searchParams.get("chNFe") ?? "");
    if (!key || key.slice(0,2) !== "53") return null;
    u.protocol = "https:";
    return u.toString();
  } catch {
    return null;
  }
}
export const DF_NFCE_CONSULTA = "https://www.fazenda.df.gov.br/nfce/consulta";

export function parseFiscalXml(source: string): ImportedFiscalDocument {
  if (source.length > 15 * 1024 * 1024) throw new Error("XML maior que 15 MB");
  if (/<!DOCTYPE|<!ENTITY/i.test(source)) throw new Error("XML com declarações externas não permitido");
  if (typeof DOMParser === "undefined") throw new Error("Leitor de XML indisponível");
  const xml = new DOMParser().parseFromString(source, "application/xml");
  if (node(xml, "parsererror")) throw new Error("XML fiscal inválido");
  const info = node(xml, "infNFe");
  if (!info) throw new Error("Arquivo não é uma NF-e/NFC-e válida");
  const ide = direct(info, "ide");
  const emit = direct(info, "emit");
  const totals = direct(info, "total");
  const icmsTot = direct(totals, "ICMSTot");
  const model = value(ide, "mod");
  if (model !== "55" && model !== "65") throw new Error("Modelo fiscal não suportado");
  const accessKey = (info.getAttribute("Id") ?? "").replace(/^NFe/, "");
  if (!extractFiscalAccessKey(accessKey)) throw new Error("Chave fiscal inválida no XML");
  if (accessKey.slice(20,22) !== model) throw new Error("Modelo divergente da chave fiscal");
  const cnpj = required(value(emit, "CNPJ"), "CNPJ do emitente");
  if (accessKey.slice(6,20) !== cnpj) throw new Error("CNPJ divergente da chave fiscal");
  const issue = required(value(ide, "dhEmi") || value(ide, "dEmi"), "Data de emissão");
  const issuedOn = issue.slice(0,10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(issuedOn)) throw new Error("Data inválida no XML");
  const detailElements = Array.from(info.getElementsByTagName("*")).filter(el => el.localName === "det");
  if (!detailElements.length) throw new Error("XML não contém produtos");
  const items = detailElements.map(det => {
    const prod = direct(det,"prod");
    const description = required(value(prod,"xProd"), "Nome do produto");
    const quantity = Number(required(value(prod,"qCom"), "Quantidade do produto"));
    if (!Number.isFinite(quantity) || quantity <= 0) throw new Error("Quantidade inválida no XML");
    const unit_price_cents = cents(required(value(prod,"vUnCom"), "Preço unitário"));
    const itemTotal = cents(required(value(prod,"vProd"), "Total do item"));
    const discount = value(prod,"vDesc") ? cents(value(prod,"vDesc")) : 0;
    const addition = (value(prod,"vOutro") ? cents(value(prod,"vOutro")) : 0) +
      (value(prod,"vFrete") ? cents(value(prod,"vFrete")) : 0);
    if (discount > itemTotal + addition) throw new Error("Desconto do item inválido");
    return {description,quantity,unit_price_cents,total_cents:itemTotal + addition - discount};
  });
  const totalCents = cents(required(value(icmsTot,"vNF"), "Total da nota"));
  const proc = node(xml,"infProt");
  const supl = node(xml,"infNFeSupl");
  return {
    model,
    accessKey,
    issuer: required(value(emit,"xNome"), "Emitente"),
    issuerCnpj: cnpj,
    issuedOn,
    documentNumber: required(value(ide,"nNF"), "Número da nota"),
    series: value(ide,"serie"),
    totalCents,
    items,
    qrCodeUrl: value(supl,"qrCode") || undefined,
    protocol: value(proc,"nProt") || undefined,
  };
}
