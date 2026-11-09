import {describe,expect,it} from "vitest";
import {brasilIntent} from "./intent";
import {lookupBrasil} from "./client";

describe("consultas BrasilAPI",()=>{
  it("reconhece pedidos explícitos e não confunde contas/CPF",()=>{
    expect(brasilIntent("CNPJ 19.131.243/0001-97")).toEqual({kind:"cnpj",value:"19.131.243/0001-97"});
    expect(brasilIntent("CEP 01001-000")).toEqual({kind:"cep",value:"01001-000"});
    expect(brasilIntent("Banco 001")).toEqual({kind:"bank",value:"001"});
    expect(brasilIntent("FIPE 001004-9")).toEqual({kind:"fipe",value:"001004-9"});
    expect(brasilIntent("taxa do CDI")).toEqual({kind:"rate",value:"CDI"});
    expect(brasilIntent("Quanto falta pagar das contas?")).toBeNull();
    expect(brasilIntent("meu CPF 12345678901")).toBeNull();
  });
  it("bloqueia URLs, parâmetros e tipos fora da lista antes do fetch",async()=>{
    await expect(lookupBrasil({kind:"cep",value:"http://127.0.0.1"})).rejects.toThrow("CEP");
    await expect(lookupBrasil({kind:"bank",value:"../../admin"})).rejects.toThrow("COMPE");
    await expect(lookupBrasil({kind:"fipe",value:"001004-9/.."})).rejects.toThrow("FIPE");
    await expect(lookupBrasil({kind:"rate",value:"OUTRA"})).rejects.toThrow("SELIC");
  });
});
