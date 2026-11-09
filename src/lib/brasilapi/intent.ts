import type { lookupBrasil, BrasilQuery } from "./client";

export function brasilIntent(question:string):BrasilQuery|null {
  const cnpj=question.match(/\bCNPJ\b(?:\s+(?:da|do|de)\s+(?:empresa|loja|fornecedor))?[\s:#-]*([0-9A-Z./-]{14,22})/i);
  if(cnpj?.[1])return {kind:"cnpj",value:cnpj[1]};
  const cep=question.match(/\bCEP\b[\s:#-]*(\d{5}-?\d{3})\b/i);
  if(cep?.[1])return {kind:"cep",value:cep[1]};
  const fipe=question.match(/\bFIPE\b.{0,32}?\b(\d{6}-\d)\b/i);
  if(fipe?.[1])return {kind:"fipe",value:fipe[1]};
  const bank=question.match(/\b(?:banco|c[oó]digo\s+banc[aá]rio)\s*(?:n[ºo.]\s*)?(\d{1,3})\b/i);
  if(bank?.[1])return {kind:"bank",value:bank[1]};
  const holidays=question.match(/\bferiados?\b(?:\s+(?:nacionais?|de|do|em))?\s*(\d{4})?\b/i);
  if(holidays){
    const year=holidays[1]||new Intl.DateTimeFormat("en-US",{timeZone:"America/Sao_Paulo",year:"numeric"}).format(new Date());
    return {kind:"holidays",value:year};
  }
  if(/\bCDI\b/i.test(question))return {kind:"rate",value:"CDI"};
  if(/\bbrasilapi\b/i.test(question)&&/\bSELIC\b/i.test(question))return {kind:"rate",value:"SELIC"};
  return null;
}

export function formatBrasilResult(r:Awaited<ReturnType<typeof lookupBrasil>>) {
  const prefix="Fonte: BrasilAPI. Dados obtidos em "+r.fetchedAt.slice(0,10)+".\n";
  switch(r.kind) {
    case "cnpj":return prefix+"CNPJ: "+r.data.cnpj+"\nRazão social: "+r.data.razaoSocial+
      "\nNome fantasia: "+(r.data.nomeFantasia||"não informado")+
      "\nSituação: "+(r.data.situacao||"não informada")+"\nLocalidade: "+r.data.municipio+"/"+r.data.uf+
      ". O cadastro não comprova idoneidade.";
    case "cep":return prefix+"CEP: "+r.data.cep+"\nEndereço: "+[r.data.logradouro,r.data.bairro,r.data.cidade,r.data.uf].filter(Boolean).join(", ")+". Confira antes de utilizar.";
    case "bank":return prefix+"Código COMPE "+String(r.data.code??"")+": "+(r.data.fullName||r.data.name||"sem nome")+
      ". ISPB: "+(r.data.ispb||"não informado")+". Não confirma titularidade bancária.";
    case "holidays":return prefix+"Feriados retornados ("+r.data.length+"):\n"+
      r.data.slice(0,40).map(h=>h.date+" — "+h.name).join("\n")+
      "\nConfira separadamente feriados estaduais e municipais.";
    case "fipe":return prefix+"Referências FIPE ("+r.data.length+" exibidas):\n"+
      r.data.slice(0,12).map(v=>v.anoModelo+" "+v.marca+" "+v.modelo+" — "+v.valor+" ("+(v.mesReferencia||"sem mês")+")").join("\n")+
      "\nFIPE é referência, não preço de venda garantido.";
    case "rate":return prefix+"Taxa "+r.data.nome+": "+r.data.valor+
      " (unidade e competência conforme a fonte). Não recalcular contratos automaticamente.";
  }
}
