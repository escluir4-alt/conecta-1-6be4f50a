import { describe, expect, it } from "vitest";
import { askSchema, conversationSchema, modelHistory, outstanding, periodBounds } from "./contracts";

describe("Axion IA", () => {
  it("isolates private context and discards history for public searches", () => {
    const history = [
      { role: "user", text: "saldo privado", scope: "private" },
      { role: "assistant", text: "texto geral", scope: "general" },
      { role: "assistant", text: "resposta que usou memória", scope: "general", usesMemory: true },
    ] as const;
    expect(modelHistory([...history], "general")).toEqual([{ role: "assistant", content: "texto geral" }]);
    expect(modelHistory([...history], "web")).toEqual([]);
  });
  it("rejects images and saved memory in public web searches", () => {
    const input = { question: "pesquise", scope: "web", tone: "direto", deep: false };
    expect(askSchema.safeParse({ ...input, includeMemory: true }).success).toBe(false);
    expect(askSchema.safeParse({ ...input, image: "data:image/png;base64,AAAA" }).success).toBe(false);
  });
  it("rejects active URLs and excessive branch history", () => {
    expect(conversationSchema.safeParse({
      id: "45faf48a-bfa4-4c4a-a794-d91170041ec7", title: "Teste", archived: false, revision: 1,
      branches: [[{ role: "assistant", scope: "general", text: "teste", sources: [{ title: "inválida", url: "javascript:alert(1)" }] }]],
    }).success).toBe(false);
    expect(conversationSchema.safeParse({
      id: "45faf48a-bfa4-4c4a-a794-d91170041ec7", title: "Teste", archived: false, revision: 1, branches: Array(13).fill([]),
    }).success).toBe(false);
  });
  it("keeps partial payments open and does not offset other bills with an overpayment", () => {
    expect(outstanding([{ expected_cents: 1000, paid_cents: 400 }, { expected_cents: 200, paid_cents: 300 }])).toBe(600);
  });
  it("uses Brazilian month boundaries at the UTC year rollover", () => {
    expect(periodBounds(new Date("2027-01-01T01:00:00Z"))).toEqual({ start: "2026-12-01", end: "2027-01-01", today: "2026-12-31" });
  });
});
