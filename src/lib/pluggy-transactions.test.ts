import { describe, expect, it } from "vitest";
import { isInstallmentTransaction } from "./pluggy.functions";

const transaction = (description: string, extra: Record<string, unknown> = {}) => ({
 id: "example", description, amount: -45, date: "2026-11-07",
 type: "DEBIT" as const, ...extra,
});

describe("filtro de parcelas da carteira", () => {
 it("remove parcelas explicitamente identificadas na descrição", () => {
  expect(isInstallmentTransaction(transaction("LOJA EXEMPLO 01/06"))).toBe(true);
  expect(isInstallmentTransaction(transaction("PARCELA 2 DE 10"))).toBe(true);
  expect(isInstallmentTransaction(transaction("Parcelamento fatura"))).toBe(true);
 });
 it("remove parcelas identificadas nos metadados", () => {
  expect(isInstallmentTransaction(transaction("Compra", {creditCardMetadata:{totalInstallments:5,installmentNumber:1}}))).toBe(true);
 });
 it("preserva PIX, transferências, compras à vista e pagamentos", () => {
  expect(isInstallmentTransaction(transaction("PIX RECEBIDO"))).toBe(false);
  expect(isInstallmentTransaction(transaction("SUPERMERCADO VISTA"))).toBe(false);
  expect(isInstallmentTransaction(transaction("PAGAMENTO BOLETO"))).toBe(false);
 });
});
