// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { extractFiscalAccessKey, officialDfQrUrl, parseFiscalXml } from "./nfce-xml";

const base = "5326112742700900013065001000031958112345678";
function withDigit(prefix: string) {
  let weight = 2, sum = 0;
  for(let i=42;i>=0;i--) {sum+=Number(prefix[i])*weight;weight=weight===9?2:weight+1;}
  const n=11-sum%11;
  return prefix+String(n>=10?0:n);
}
const key = withDigit(base);

describe("Axion fiscal: documento eletrônico", () => {
  it("identifica a chave fiscal válida em texto e QR Code", () => {
    expect(key).toHaveLength(44);
    expect(extractFiscalAccessKey(key)).toBe(key);
    expect(extractFiscalAccessKey("https://www.fazenda.df.gov.br/nfce/qrcode?p="+key+"%7C2%7C1")).toBe(key);
    expect(extractFiscalAccessKey(key.slice(0,43)+"8")).toBeNull();
    expect(extractFiscalAccessKey("7891000123456")).toBeNull();
  });
  it("somente confia na URL do serviço oficial do DF", () => {
    expect(officialDfQrUrl("https://www.fazenda.df.gov.br/nfce/qrcode?p="+key+"%7C2%7C1")).toContain("/nfce/qrcode?p=");
    expect(officialDfQrUrl("https://notafalsa.example/nfce/qrcode?p="+key)).toBeNull();
    expect(officialDfQrUrl("javascript:alert(1)")).toBeNull();
  });
  it("importa itens e metadados diretamente do XML, sem OCR", () => {
    const xml = [
      '<?xml version="1.0" encoding="utf-8"?>',
      '<nfeProc xmlns="http://www.portalfiscal.inf.br/nfe"><NFe><infNFe Id="NFe'+key+'">',
      '<ide><mod>65</mod><serie>1</serie><nNF>31958</nNF><dhEmi>2026-11-09T12:00:00-03:00</dhEmi></ide>',
      '<emit><CNPJ>27427009000130</CNPJ><xNome>Mercado Exemplo</xNome></emit>',
      '<det nItem="1"><prod><xProd>Pizza Primor</xProd><qCom>2.0000</qCom><vUnCom>28.9000</vUnCom><vProd>57.80</vProd></prod></det>',
      '<total><ICMSTot><vNF>57.80</vNF></ICMSTot></total></infNFe></NFe>',
      '<protNFe><infProt><nProt>123456</nProt></infProt></protNFe></nfeProc>',
    ].join("");
    const data = parseFiscalXml(xml);
    expect(data.accessKey).toBe(key);
    expect(data.issuer).toBe("Mercado Exemplo");
    expect(data.issuedOn).toBe("2026-11-09");
    expect(data.totalCents).toBe(5780);
    expect(data.items).toEqual([{description:"Pizza Primor",quantity:2,unit_price_cents:2890,total_cents:5780}]);
    expect(data.protocol).toBe("123456");
  });
  it("recusa XML com DTD ou sem documento fiscal", () => {
    expect(()=>parseFiscalXml("<!DOCTYPE a><a/>")).toThrow();
    expect(()=>parseFiscalXml("<a/>")).toThrow();
  });
});
