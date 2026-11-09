import { z } from "zod";

/** Apenas consultas pontuais, sem scraping ou URLs configuráveis. Uso exclusivo no servidor. */
export const brasilQuerySchema = z.object({
  kind: z.enum(["cnpj","cep","bank","holidays","fipe","rate"]),
  value: z.string().trim().min(1).max(40),
});
export type BrasilQuery = z.infer<typeof brasilQuerySchema>;
const BASE = "https://brasilapi.com.br/api";
const cache = new Map<string,{expires:number;fetchedAt:string;data:unknown}>();
const hits = new Map<string,{start:number;count:number}>();

/** Limite local por instância e usuário; para escala, usar limitador distribuído. */
export function checkBrasilQuota(userId:string) {
  const now=Date.now(), previous=hits.get(userId);
  const state= !previous || now-previous.start>=60_000 ? {start:now,count:0} : previous;
  if(state.count>=20)throw new Error("Limite de consultas BrasilAPI atingido. Tente novamente em um minuto.");
  state.count++;hits.set(userId,state);
  if(hits.size>300)hits.delete(hits.keys().next().value!);
}
function endpoint(q:BrasilQuery) {
  const v=q.value.trim().toUpperCase();
  switch(q.kind) {
    case "cnpj": {
      const id=v.replace(/[.\s/-]/g,"");
      if(!/^[0-9A-Z]{12}[0-9]{2}$/.test(id))throw new Error("Informe um CNPJ válido com 14 caracteres.");
      return {path:"/cnpj/v1/"+id,ttl:86400000};
    }
    case "cep": {
      const id=v.replace(/[\s-]/g,"");
      if(!/^\d{8}$/.test(id))throw new Error("Informe um CEP com oito dígitos.");
      return {path:"/cep/v1/"+id,ttl:604800000};
    }
    case "bank": {
      if(!/^\d{1,3}$/.test(v))throw new Error("Informe o código COMPE de até três dígitos.");
      return {path:"/banks/v1/"+Number(v),ttl:86400000};
    }
    case "holidays": {
      if(!/^\d{4}$/.test(v)||Number(v)<1900||Number(v)>2199)throw new Error("Ano inválido.");
      return {path:"/feriados/v1/"+v,ttl:2592000000};
    }
    case "fipe": {
      if(!/^\d{6}-\d$/.test(v))throw new Error("Informe o código FIPE no formato 001004-9.");
      return {path:"/fipe/preco/v1/"+v,ttl:43200000};
    }
    case "rate": {
      if(v!=="SELIC"&&v!=="CDI")throw new Error("Consulte apenas as taxas SELIC ou CDI.");
      return {path:"/taxas/v1/"+v,ttl:3600000};
    }
  }
}
async function request(path:string,ttl:number) {
  const old=cache.get(path);
  if(old&&old.expires>Date.now())return old;
  let response:Response;
  try {
    response=await fetch(BASE+path,{headers:{Accept:"application/json"},redirect:"error",signal:AbortSignal.timeout(8500)});
  }catch {throw new Error("BrasilAPI indisponível. Nenhum registro foi alterado.");}
  if(response.status===404)throw new Error("Registro não encontrado na BrasilAPI.");
  if(response.status===429)throw new Error("BrasilAPI temporariamente limitada; tente mais tarde.");
  if(!response.ok)throw new Error("BrasilAPI indisponível (HTTP "+response.status+").");
  if(!(response.headers.get("content-type")??"").includes("json"))throw new Error("Formato inesperado da BrasilAPI.");
  const payload=await response.text();
  if(payload.length>300000)throw new Error("Resposta da BrasilAPI acima do tamanho permitido.");
  let data:unknown;
  try { data=JSON.parse(payload); }catch {throw new Error("BrasilAPI retornou JSON inválido.");}
  const entry={data,expires:Date.now()+ttl,fetchedAt:new Date().toISOString()};
  if(cache.size>=250)cache.delete(cache.keys().next().value!);
  cache.set(path,entry);
  return entry;
}
const txt=z.string().nullish();
const company=z.object({cnpj:txt,razao_social:txt,nome_fantasia:txt,descricao_situacao_cadastral:txt,municipio:txt,uf:txt,logradouro:txt,numero:txt,cep:txt});
const cep=z.object({cep:z.string(),state:z.string(),city:z.string(),neighborhood:txt,street:txt});
const bank=z.object({code:z.number().nullish(),name:txt,fullName:txt,ispb:txt});
const holiday=z.object({date:z.string(),name:z.string(),type:txt});
const vehicle=z.object({valor:z.string(),marca:z.string(),modelo:z.string(),anoModelo:z.number(),combustivel:txt,codigoFipe:z.string(),mesReferencia:txt});
const rate=z.object({nome:z.string(),valor:z.number()});

export async function lookupBrasil(raw:BrasilQuery) {
  const q=brasilQuerySchema.parse(raw);
  const e=endpoint(q), result=await request(e.path,e.ttl), data=result.data;
  const common={source:BASE+e.path,fetchedAt:result.fetchedAt};
  switch(q.kind) {
    case "cnpj": {
      const c=company.parse(data);
      return {...common,kind:"cnpj" as const,data:{cnpj:c.cnpj??"",razaoSocial:c.razao_social??"",nomeFantasia:c.nome_fantasia??"",situacao:c.descricao_situacao_cadastral??"",municipio:c.municipio??"",uf:c.uf??"",logradouro:c.logradouro??"",numero:c.numero??"",cep:c.cep??""}};
    }
    case "cep": {
      const c=cep.parse(data);
      return {...common,kind:"cep" as const,data:{cep:c.cep,uf:c.state,cidade:c.city,bairro:c.neighborhood??"",logradouro:c.street??""}};
    }
    case "bank":return {...common,kind:"bank" as const,data:bank.parse(data)};
    case "holidays":return {...common,kind:"holidays" as const,data:z.array(holiday).max(100).parse(data)};
    case "fipe":return {...common,kind:"fipe" as const,data:z.array(vehicle).max(200).parse(data).slice(0,35)};
    case "rate":return {...common,kind:"rate" as const,data:rate.parse(data)};
  }
}
