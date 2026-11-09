import { describe, expect, it } from "vitest";
import { isMissingCardProfileTable } from "@/lib/finance/card-profile-status";

describe("fallback seguro para vínculos de cartões", () => {
  it("identifica ausência real da tabela no cache PostgREST", () => {
    expect(isMissingCardProfileTable({
      code:"PGRST205",
      message:"Could not find the table 'public.finance_account_profiles' in the schema cache",
    })).toBe(true);
  });
  it("não oculta erros de permissão, rede ou outras tabelas", () => {
    expect(isMissingCardProfileTable({code:"42501",message:"permission denied for table finance_account_profiles"})).toBe(false);
    expect(isMissingCardProfileTable({code:"PGRST205",message:"Could not find the table 'public.finance_bills' in the schema cache"})).toBe(false);
    expect(isMissingCardProfileTable({code:"PGRST116",message:"No rows"})).toBe(false);
    expect(isMissingCardProfileTable(null)).toBe(false);
  });
});
