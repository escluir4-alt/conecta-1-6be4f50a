import {describe,it,expect} from "vitest";
import {brl,checkDate,parseBRL,validateFiscal} from "./fiscal";
describe("Notas fiscais — moeda, datas e validações",()=>{
 it("converte centavos brasileiros sem perdas",()=>{expect(parseBRL("R$ 1.234,56")).toBe(123456);expect(parseBRL("0,01")).toBe(1);expect(brl(123456)).toContain("1.234,56")});
 it("rejeita separadores incorretos",()=>{expect(()=>parseBRL("1,234.56")).toThrow();expect(()=>parseBRL("12,345")).toThrow();expect(()=>parseBRL("-1")).toThrow()});
 it("verifica datas civis",()=>{expect(checkDate("2026-02-28")).toBe(true);expect(checkDate("2026-02-31")).toBe(false);expect(checkDate("2024-02-29")).toBe(true)});
 it("exige campos mínimos",()=>{const file=new File(["%PDF-1.7"],"a.pdf",{type:"application/pdf"});expect(()=>validateFiscal(file,{issuer:"",issued_on:"2026-11-07",document_number:"",access_key:"",total:"10,00",category:"outros"})).toThrow()});
});
