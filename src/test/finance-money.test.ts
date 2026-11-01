import { describe, expect, it } from "vitest";
import {
  autoNote,
  clampDueDate,
  diffLabel,
  displayNote,
  formatBRL,
  monthOfDueDate,
  parseBRL,
  paymentDifference,
} from "@/lib/finance/money";

describe("formatBRL", () => {
  it("formata centavos em pt-BR", () => {
    expect(formatBRL(135976)).toBe("R$ 1.359,76".replace("R$ ", "R$\u00a0"));
  });
  it("retorna travessão para null", () => {
    expect(formatBRL(null)).toBe("—");
  });
});

describe("parseBRL", () => {
  it("converte formato brasileiro para centavos", () => {
    expect(parseBRL("1.359,76")).toBe(135976);
    expect(parseBRL("507,20")).toBe(50720);
    expect(parseBRL("R$ 79,90")).toBe(7990);
  });
  it("rejeita mais de 2 casas decimais", () => {
    expect(parseBRL("10,123")).toBeNull();
  });
  it("rejeita texto inválido", () => {
    expect(parseBRL("abc")).toBeNull();
    expect(parseBRL("")).toBeNull();
  });
});

describe("clampDueDate", () => {
  it("limita dia 31 em fevereiro", () => {
    expect(clampDueDate(2026, 2, 31)).toBe("2026-02-28");
  });
  it("mantém dia válido", () => {
    expect(clampDueDate(2026, 10, 13)).toBe("2026-10-13");
  });
});

describe("monthOfDueDate", () => {
  it("extrai competência AAAA-MM", () => {
    expect(monthOfDueDate("2026-10-13")).toBe("2026-10");
  });
});

describe("paymentDifference", () => {
  it("pago menor que previsto é desconto negativo", () => {
    expect(paymentDifference(136068, 135422)).toBe(-646);
  });
});

describe("autoNote", () => {
  it("pagamento em dia sem diferença", () => {
    expect(autoNote("2026-10-07", "2026-10-07", 50720, 50720)).toBe("Pago em dia");
  });
  it("antecipado com desconto", () => {
    const note = autoNote("2026-10-13", "2026-10-06", 136068, 135422);
    expect(note).toContain("antecedência");
    expect(note).toContain("desconto");
  });
  it("atraso", () => {
    expect(autoNote("2025-09-13", "2025-09-15", 136068, 136068)).toContain("atraso");
  });
});

describe("displayNote", () => {
  it("observação manual tem prioridade", () => {
    expect(
      displayNote({ due_date: "2026-10-03", paid_date: "2026-10-03", expected_cents: 17236, paid_cents: 17236, paid_note: "Pago conforme documento" }),
    ).toBe("Pago conforme documento");
  });
  it("pendente mostra travessão", () => {
    expect(displayNote({ due_date: "2026-11-03", paid_date: null, expected_cents: 17236, paid_cents: null })).toBe("—");
  });
});

describe("diffLabel", () => {
  it("zero mostra travessão", () => {
    expect(diffLabel(50720, 50720)).toBe("—");
  });
  it("desconto mostra percentual e valor negativos", () => {
    const label = diffLabel(136068, 135422);
    expect(label).toContain("−0,47%");
    expect(label).toContain("6,46");
  });
});
