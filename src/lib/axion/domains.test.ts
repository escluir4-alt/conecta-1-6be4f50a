import { describe, expect, it } from "vitest";
import { marketIntent } from "./domains";

describe("identificação de mercado sem modelo", () => {
  it("identifica Selic e códigos B3 sem repetir símbolos", () => {
    expect(marketIntent("cotação de petr4 e VALE3, PETR4")).toEqual({ kind: "stocks", tickers: ["PETR4", "VALE3"] });
    expect(marketIntent("Qual a meta Selic?")).toEqual({ kind: "selic" });
    expect(marketIntent("Goiânia amanhã")).toBeNull();
  });
});
