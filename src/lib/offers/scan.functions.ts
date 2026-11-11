import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type FoundOffer = {
  id: string; title: string; store: string; category: string; price: number; previous: number;
  shipping: number; coupon: number; cashback: number; url: string; reference: "anunciado" | "historico";
  checkedAt: string;
};
type JsonValue = Record<string, unknown>;
const allowedDomains = [
  "mercadolivre.com.br", "amazon.com.br", "magazineluiza.com.br",
  "magalu.com", "casasbahia.com.br", "kabum.com.br",
  "shopee.com.br", "americanas.com.br", "carrefour.com.br",
  "extra.com.br", "pontofrio.com.br", "fastshop.com.br",
  "lojasrenner.com.br", "netshoes.com.br", "centauro.com.br",
];
function allowed(host: string) {
  const h = host.toLowerCase().replace(/\.$/, "");
  return allowedDomains.some(domain => h === domain || h.endsWith("." + domain));
}
function parseUrl(raw: string): URL {
  const url = new URL(raw);
  if (url.protocol !== "https:" || url.username || url.password || url.port || !allowed(url.hostname)) {
    throw new Error("Informe um link HTTPS de uma loja brasileira habilitada, sem usuário, senha ou porta.");
  }
  url.hash = "";
  return url;
}
const inputSchema = z.object({ url: z.string().trim().min(10).max(2000)["url"](), pages: z.number().int().min(1).max(5).default(3) });
const namedEntities: Record<string,string> = {
  amp:"&", quot:'"', apos:"'", lt:"<", gt:">", nbsp:" ",
  aacute:"á", agrave:"à", acirc:"â", atilde:"ã", auml:"ä",
  eacute:"é", egrave:"è", ecirc:"ê", euml:"ë",
  iacute:"í", igrave:"ì", icirc:"î",
  oacute:"ó", ograve:"ò", ocirc:"ô", otilde:"õ", ouml:"ö",
  uacute:"ú", ugrave:"ù", ucirc:"û", uuml:"ü",
  ccedil:"ç", ntilde:"ñ", ordm:"º", ordf:"ª", ndash:"–", mdash:"—",
  hellip:"…", rsquo:"’", lsquo:"‘", ldquo:"“", rdquo:"”",
};
function decode(value:string):string {
  return value.replace(/&(#x[0-9a-f]+|#[0-9]+|[a-z][a-z0-9]+);/gi, (whole, code:string) => {
    if(code[0]==="#") {
      const hex=code[1]?.toLowerCase()==="x";
      const n=parseInt(code.slice(hex?2:1),hex?16:10);
      return n>0 && n<=0x10ffff && !(n>=0xd800 && n<=0xdfff) ? String.fromCodePoint(n) : whole;
    }
    const key=code.toLowerCase();
    const mapped=namedEntities[key];
    return mapped ? (code[0]===code[0]?.toUpperCase() && key!=="amp" ? mapped.toUpperCase():mapped) : whole;
  });
}
const textOnly = (value: string) => decode(value.replace(/<[^>]*>/g," ").replace(/\s+/g," ").trim());
function money(value: unknown): number {
  if (typeof value === "number") return Number.isFinite(value) ? value : NaN;
  if (typeof value !== "string") return NaN;
  const clean = value.replace(/[^\d.,]/g, "");
  if (!clean) return NaN;
  const decimal = clean.includes(",") && clean.includes(".")
    ? clean.lastIndexOf(",") > clean.lastIndexOf(".") ? clean.replace(/\./g, "").replace(",", ".") : clean.replace(/,/g, "")
    : clean.includes(",") ? clean.replace(",", ".") : clean;
  const n = Number(decimal);
  return Number.isFinite(n) ? n : NaN;
}
function objects(root: unknown, depth = 0, seen = new Set<object>()): JsonValue[] {
  if (!root || typeof root !== "object" || depth > 12 || seen.has(root)) return [];
  seen.add(root);
  if (Array.isArray(root)) return root.flatMap(x => objects(x, depth + 1, seen));
  const obj = root as JsonValue;
  return [obj, ...Object.values(obj).flatMap(v => objects(v, depth + 1, seen))];
}
function types(node: JsonValue) {
  const t = node["@type"];
  return (Array.isArray(t) ? t : [t]).some(x => typeof x === "string" && x.toLowerCase().split("/").pop() === "product");
}
function extractProducts(html: string, page: URL, store: string): FoundOffer[] {
  const found: FoundOffer[] = [];
  const blocks = html.matchAll(/<script\b[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script\s*>/gi);
  for (const match of blocks) {
    let json: unknown;
    try { json = JSON.parse((match[1] ?? "").replace(/<!--|-->/g, "").trim()); } catch { continue; }
    for (const node of objects(json)) {
      if (!types(node)) continue;
      const title = typeof node["name"] === "string" ? textOnly(node["name"]).slice(0, 240) : "";
      if (!title) continue;
      const offers = Array.isArray(node["offers"]) ? node["offers"] : node["offers"] ? [node["offers"]] : [];
      for (const rawOffer of offers) {
        if (!rawOffer || typeof rawOffer !== "object") continue;
        const offer = rawOffer as JsonValue;
        const price = money(offer["price"] ?? offer["lowPrice"] ?? (offer["priceSpecification"] as JsonValue | undefined)?.["price"]);
        const currency = offer["priceCurrency"] ?? (offer["priceSpecification"] as JsonValue | undefined)?.["priceCurrency"];
        if (currency && currency !== "BRL") continue;
        if (!(price > 0 && price < 100000000)) continue;
        // Do not invent previous prices: priceSpecification may include a real "StrikethroughPrice".
        const specs = Array.isArray(offer["priceSpecification"]) ? offer["priceSpecification"] : offer["priceSpecification"] ? [offer["priceSpecification"]] : [];
        const strikethrough = specs.find(s => s && typeof s === "object" && /strikethrough|listprice|regularprice/i.test(String((s as JsonValue)["@type"] ?? ""))) as JsonValue | undefined;
        const previous = money(strikethrough?.["price"]);
        let target = page.href;
        const candidate = typeof offer["url"] === "string" ? offer["url"] : typeof node["url"] === "string" ? node["url"] : null;
        if (candidate) {
          try { const parsed = new URL(candidate, page); if (parsed.protocol === "https:" && allowed(parsed.hostname)) target = parsed.href; } catch { /* keep page URL */ }
        }
        found.push({ id: target + "::" + title, title, store, category: typeof node["category"] === "string" ? node["category"].slice(0, 60) : "Geral", price, previous: previous > price ? previous : 0, shipping: 0, coupon: 0, cashback: 0, url: target, reference: "anunciado", checkedAt: new Date().toISOString() });
      }
    }
  }
  return found;
}
function pageLinks(html: string, source: URL, root: URL): URL[] {
  const links: URL[] = [];
  const pattern = /<a\b[^>]*href\s*=\s*["']([^"'<>]{1,600})["'][^>]*>/gi;
  for (const m of html.matchAll(pattern)) {
    let link: URL;
    try { link = parseUrl(new URL(decode(m[1] ?? ""), source).href); } catch { continue; }
    if (link.hostname !== root.hostname || link.pathname === source.pathname && link.search === source.search) continue;
    if (!/(ofertas|promo|descont|sale|black-friday|\bpage\b|pagina|\/p\d+|[?&]page=|\/dp\/|\/gp\/product\/|\/produto\/|\/product\/|\/p\/)/i.test(link.pathname + link.search)) continue;
    if (/login|checkout|cart|conta|account|pedido/i.test(link.pathname)) continue;
    links.push(link);
    if (links.length >= 30) break;
  }
  return links;
}

async function safeFetch(original: URL, headers: Record<string,string>, timeoutMs: number): Promise<{response: Response; finalUrl: URL}> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  let current = original;
  try {
    for (let hop=0; hop<4; hop++) {
      const response = await fetch(current.href, {redirect:"manual",signal:controller.signal,headers,cache:"no-store"});
      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get("location");
        if (!location) throw new Error("Redirecionamento sem endereço.");
        const next = parseUrl(new URL(location,current).href);
        if (next.hostname.replace(/^www\./,"") !== original.hostname.replace(/^www\./,""))
          throw new Error("Redirecionamento para outro domínio; informe o link final da loja.");
        current=next;
        await response.body?.cancel();
        continue;
      }
      return {response,finalUrl:current};
    }
    throw new Error("A loja redirecionou a página muitas vezes.");
  } finally { clearTimeout(timer); }
}
async function fetchHtml(url:URL):Promise<{html:string;finalUrl:URL}> {
  const {response,finalUrl}=await safeFetch(url,{"Accept":"text/html,application/xhtml+xml","User-Agent":"AxionOffersBot/1.0"},12000);
  if ([403,429,503].includes(response.status)) throw new Error("A loja bloqueou a consulta automatizada (HTTP "+response.status+").");
  if (!response.ok) throw new Error("A loja recusou a página (HTTP "+response.status+").");
  if (!(response.headers.get("content-type") ?? "").toLowerCase().includes("text/html"))
    throw new Error("O endereço não retornou HTML.");
  if (Number(response.headers.get("content-length")||0)>1500000) throw new Error("Página muito grande.");
  const reader=response.body?.getReader();
  if (!reader) throw new Error("HTML indisponível.");
  let size=0;const parts:Uint8Array[]=[];
  while(true) {
    const chunk=await reader.read();
    if(chunk.done)break;
    size+=chunk.value.byteLength;
    if(size>1500000){await reader.cancel();throw new Error("Página maior que 1,5 MB.");}
    parts.push(chunk.value);
  }
  const merged=new Uint8Array(size);let offset=0;
  for(const part of parts){merged.set(part,offset);offset+=part.byteLength;}
  return {html:new TextDecoder().decode(merged),finalUrl};
}
async function permitted(url:URL):Promise<boolean>{
  try{
    const robots=new URL("/robots.txt",url.origin);
    const {response}=await safeFetch(robots,{"Accept":"text/plain","User-Agent":"AxionOffersBot/1.0"},5000);
    if(response.status===404)return true;
    if(!response.ok)return false;
    const content=(await response.text()).slice(0,150000);
    // Follow rules for this bot, otherwise wildcard group. Most specific path wins.
    const groups=content.split(/\n\s*\n/);
    const getRules=(name:string)=>groups.filter(g=>new RegExp("(?:^|\\n)\\s*User-agent:\\s*"+name+"\\s*(?:\\n|$)","i").test(g)).flatMap(g=>
      [...g.matchAll(/^\s*(Allow|Disallow):\s*(\S*)/gim)].map(m=>({allow:m[1]?.toLowerCase()==="allow",path:m[2]??""}))
    );
    const rules=getRules("AxionOffersBot").length?getRules("AxionOffersBot"):getRules("\\*");
    const path=url.pathname+url.search;
    const matches=rules.filter(r=>r.path && path.startsWith(r.path.split("*")[0]??""))
      .sort((a,b)=>b.path.length-a.path.length||Number(b.allow)-Number(a.allow));
    return matches[0]?.allow??true;
  }catch{return false;}
}
export const scanStoreOffers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(inputSchema)
  .handler(async ({ data }) => {
    const root = parseUrl(data["url"]);
    const seen = new Set<string>();
    const queue = [root];
    const offers = new Map<string, FoundOffer>();
    const notices: string[] = [];
    let pagesScanned = 0;
    let pagesAttempted = 0;
    let failedPages = 0;
    // Count attempts, not just successful pages. Abort repeated blocks.
    while (queue.length && pagesAttempted < data.pages) {
      const url = queue.shift()!;
      if (seen.has(url.href)) continue;
      seen.add(url.href);
      pagesAttempted++;
      if (!(await permitted(url))) {
        failedPages++;
        if (!notices.includes("Consulta impedida pelas regras de acesso do site (robots.txt)."))
          notices.push("Consulta impedida pelas regras de acesso do site (robots.txt).");
        break;
      }
      try {
        const {html, finalUrl} = await fetchHtml(url);
        pagesScanned++;
        for (const offer of extractProducts(html, finalUrl, root.hostname)) {
          const prev = offers.get(offer.id);
          if (!prev || (offer.previous > offer["price"] && prev.previous <= prev["price"])) offers.set(offer.id, offer);
        }
        for (const link of pageLinks(html, finalUrl, root)) {
          if (!seen.has(link.href) && !queue.some(x => x.href === link.href)) queue.push(link);
        }
      } catch (err) {
        failedPages++;
        const message = err instanceof Error ? err.message : "Erro ao consultar a loja.";
        if (!notices.includes(message)) notices.push(message);
        if (/bloqueou|não retornou HTML|recusou|redirecionou|não disponibilizou/i.test(message)) break;
      }
    }
    const detected = [...offers.values()];
    // A product without a reliable previous price is not a measurable discount.
    const verifiedAdvertised = detected.filter(o => o.previous > o.price && o.price > 0);
    verifiedAdvertised.sort((a,b) => ((b.previous-b.price)/b.previous)-((a.previous-a.price)/a.previous));
    return { source: root.origin, pagesScanned, pagesAttempted, failedPages, productsDetected: detected.length,
      skippedWithoutDiscount: detected.length-verifiedAdvertised.length, offers: verifiedAdvertised.slice(0,200), notices, checkedAt: new Date().toISOString(),
      note: "Somente produtos com dados estruturados públicos (JSON-LD). Descontos são anunciados, não verificados historicamente. Alguns sites não permitem acesso automático." };
  });
