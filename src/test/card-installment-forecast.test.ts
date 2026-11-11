import {describe,it,expect} from "vitest";
import {projectCardInstallments} from "@/lib/finance/card-installment-forecast";
describe("previsão segura de parcelas futuras",()=>{
  it("projeta somente parcelas explícitas de 2027",()=>{
    const result=projectCardInstallments([{id:"a",description:"Compra",date:"2026-11-10",amount:120,type:"DEBIT",creditCardMetadata:{installmentNumber:2,totalInstallments:5}}],2027,2027);
    expect(result).toEqual([{year:2027,month:1,expected_cents:12000,installments:1},{year:2027,month:2,expected_cents:12000,installments:1}]);
  });
  it("não inventa compras futuras sem metadados",()=>{
    expect(projectCardInstallments([{id:"x",description:"Compra",date:"2026-11-10",amount:100,type:"DEBIT"}],2027)).toEqual([]);
  });
  it("ignora estornos e mantém apenas a parcela mais recente de uma sequência",()=>{
    const tx=(id:string,date:string,n:number,type:"DEBIT"|"CREDIT"="DEBIT")=>({id,description:"Loja",date,amount:50,type,installmentNumber:n,totalInstallments:8});
    const result=projectCardInstallments([tx("1","2026-10-10",2),tx("2","2026-11-10",3),tx("3","2026-11-10",3,"CREDIT")],2027,2027);
    expect(result.map(x=>x.expected_cents)).toEqual([5000,5000,5000,5000]);
  });
});
