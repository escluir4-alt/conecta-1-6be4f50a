import { describe, expect, it } from "vitest";
import { cheapestTrip, decimalInput, marketIntent, tripCost } from "./domains";
describe("mercado e viagens sem modelo", () => {
  it("identifica Selic e códigos B3 sem repetir símbolos", () => {
    expect(marketIntent("cotação de petr4 e VALE3, PETR4")).toEqual({ kind: "stocks", tickers: ["PETR4", "VALE3"] });
    expect(marketIntent("Qual a meta Selic?")).toEqual({ kind: "selic" });
    expect(marketIntent("Goiânia amanhã")).toBeNull();
  });
  it("mantém tarifa desconhecida separada de uma tarifa zero confirmada", () => {
    expect(tripCost(600, 12, 6, null)).toEqual({ liters: 50, fuelCents: 30000, totalCents: null });
    expect(tripCost(600, 12, 6, 0)?.totalCents).toBe(30000);
    expect(tripCost(600, 12, 6, 1234)?.totalCents).toBe(31234);
    expect(tripCost(600, 0, 6, 0)).toBeNull();
  });
  it("não proclama uma rota barata diante de total parcial ou empate", () => {
    expect(cheapestTrip([{ totalCents: null }, { totalCents: 2000 }])).toBeNull();
    expect(cheapestTrip([{ totalCents: 2000 }, { totalCents: 2000 }])).toBeNull();
    expect(cheapestTrip([{ totalCents: 3000 }, { totalCents: 2000 }])).toBe(1);
  });
  it("aceita decimais brasileiros sem confundir campo vazio com zero", () => {
    expect(decimalInput("6,20")).toBe(6.2);
    expect(decimalInput("")).toBeNull();
    expect(decimalInput("0")).toBe(0);
    expect(decimalInput("1.234,55")).toBeNull();
  });
});
