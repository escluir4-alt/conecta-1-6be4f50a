import { describe, expect, it } from "vitest";
import { askSchema } from "./contracts";
import { dateOffset, geminiPayload, internalIntent } from "./free-mode";

describe("modos sem API paga", () => {
  it("classifica as perguntas propostas e atravessa a virada do mês", () => {
    expect(internalIntent("O que vence nos próximos 7 dias?")).toBe("weekly");
    expect(internalIntent("Quanto falta pagar neste mês?")).toBe("bills");
    expect(internalIntent("Quais são meus próximos compromissos?")).toBe("agenda");
    expect(internalIntent("Quais as receitas previstas?")).toBe("revenue");
    expect(dateOffset("2026-11-29", 7)).toBe("2026-12-06");
  });
  it("envia só a pergunta ao Gemini, sem ferramentas ou histórico", () => {
    const payload = geminiPayload("Olá", "direto", false);
    expect(payload.contents).toEqual([{ role: "user", parts: [{ text: "Olá" }] }]);
    expect(payload).not.toHaveProperty("tools");
  });
  it.each(["free", "internal"])("bloqueia anexos e memória no modo %s", scope => {
    const input = { question: "Olá", tone: "direto", deep: false, scope };
    expect(askSchema.safeParse(input).success).toBe(true);
    expect(askSchema.safeParse({ ...input, includeMemory: true }).success).toBe(false);
    expect(askSchema.safeParse({ ...input, image: "data:image/png;base64,AAAA" }).success).toBe(false);
  });
});
