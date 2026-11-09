/** Only suppress a known missing-table error. All other DB failures must surface. */
export type FinanceProfileDbError = { code?: string | null; message?: string | null };
export const CARD_PROFILES_MIGRATION_MESSAGE =
  "Vínculos de cartões indisponíveis neste banco. Aplique primeiro a migração " +
  "20261107140000_finance_card_profiles_invoices.sql e recarregue o esquema do PostgREST. " +
  "Nenhuma fatura ou pagamento foi alterado.";

export function isMissingCardProfileTable(error: FinanceProfileDbError | null | undefined): boolean {
  if (!error) return false;
  const code = error.code ?? "";
  const message = error.message ?? "";
  if (!/finance_account_profiles/i.test(message)) return false;
  return code === "PGRST205" || code === "42P01" ||
    /could not find the table|relation .* does not exist|schema cache/i.test(message);
}
