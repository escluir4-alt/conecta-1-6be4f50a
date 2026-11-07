import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertUserCreditCard } from "@/lib/pluggy.functions";

const profileSchema = z.object({
  accountId: z.string().min(1).max(200),
  displayName: z.string().trim().max(100).nullable(),
  cardBrand: z.enum(["VISA", "MASTERCARD", "ELO", "AMEX", "HIPERCARD", "OTHER"]).nullable(),
  annualExpenseId: z.string().uuid().nullable(),
});

export const getFinanceAccountProfiles = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase.from("finance_account_profiles")
      .select("account_id,display_name,card_brand,annual_expense_id")
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const saveFinanceAccountProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => profileSchema.parse(input))
  .handler(async ({ data, context }) => {
    // Verificação de posse do cartão por meio da conexão bancária original.
    await assertUserCreditCard(context.supabase, context.userId, data.accountId);
    if (data.annualExpenseId) {
      const { data: annual, error } = await context.supabase.from("annual_expenses")
        .select("id").eq("id", data.annualExpenseId).eq("user_id", context.userId).maybeSingle();
      if (error || !annual) throw new Error("Credor anual não pertence ao usuário.");
    }
    const { error } = await context.supabase.from("finance_account_profiles").upsert({
      user_id: context.userId, account_id: data.accountId,
      display_name: data.displayName || null, card_brand: data.cardBrand,
      annual_expense_id: data.annualExpenseId,
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id,account_id" });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const recordClosedCardInvoice = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({
    accountId: z.string().min(1).max(200),
    period: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/),
    closedAt: z.string().date(),
    dueDate: z.string().date(),
    amountCents: z.number().int().min(0).max(999999999999),
  }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertUserCreditCard(supabase, userId, data.accountId);
    const { data: profile, error: profileError } = await supabase.from("finance_account_profiles")
      .select("annual_expense_id").eq("user_id", userId).eq("account_id", data.accountId).maybeSingle();
    if (profileError) throw new Error(profileError.message);
    if (!profile?.annual_expense_id) throw new Error("Associe primeiro o cartão a um credor das Despesas Anuais.");
    const { data: annual, error: annualError } = await supabase.from("annual_expenses")
      .select("id,year,creditor").eq("id", profile.annual_expense_id).eq("user_id", userId).maybeSingle();
    if (annualError || !annual) throw new Error("Credor anual não encontrado.");
    const [year, month] = data.period.split("-").map(Number);
    if (annual.year !== year) throw new Error("O credor vinculado precisa pertencer ao exercício da competência.");
    const { data: annualYear } = await supabase.from("annual_years")
      .select("archived_at").eq("year", year).eq("user_id", userId).maybeSingle();
    if (annualYear?.archived_at) throw new Error("Exercício arquivado não pode ser alterado.");
    // Não sobrescrever pagamentos já quitados ou fatos financeiros históricos.
    const { data: bills, error: billError } = await supabase.from("finance_bills")
      .select("id,paid_date").eq("user_id", userId)
      .eq("source_annual_id", annual.id).eq("source_period", data.period);
    if (billError) throw new Error(billError.message);
    if ((bills ?? []).some((b: {paid_date: string | null}) => b.paid_date))
      throw new Error("Já existe pagamento registrado; a fatura deve ser conciliada manualmente.");
    const { data: previous, error: oldError } = await supabase.from("finance_card_closed_invoices")
      .select("amount_cents").eq("user_id", userId).eq("account_id", data.accountId)
      .eq("period", data.period).maybeSingle();
    if (oldError) throw new Error(oldError.message);
    const { error: invoiceError } = await supabase.from("finance_card_closed_invoices").upsert({
      user_id: userId, account_id: data.accountId, period: data.period,
      closed_at: data.closedAt, due_date: data.dueDate, amount_cents: data.amountCents,
      origin: "manual", annual_expense_id: annual.id, updated_at: new Date().toISOString(),
    }, { onConflict: "user_id,account_id,period" });
    if (invoiceError) throw new Error(invoiceError.message);
    const { error: monthError } = await supabase.from("annual_expense_months").upsert({
      annual_expense_id: annual.id, month, expected_cents: data.amountCents,
    }, { onConflict: "annual_expense_id,month" });
    if (monthError) throw new Error("Fatura registrada, mas não foi possível atualizar a grade anual: " + monthError.message);
    if ((bills ?? []).length) {
      const { error: updateError } = await supabase.from("finance_bills")
        .update({ expected_cents: data.amountCents, due_date: data.dueDate })
        .eq("user_id", userId).eq("source_annual_id", annual.id)
        .eq("source_period", data.period).is("paid_date", null);
      if (updateError) throw new Error("Grade anual atualizada; falha ao atualizar conta mensal: " + updateError.message);
    }
    await supabase.rpc("audit_append", { p_action: "closed_card_invoice", p_entity_type: "annual_expense",
      p_entity_id: annual.id, p_before: previous, p_after: { period: data.period, amount_cents: data.amountCents },
      p_details: { origin: "manual", card_linked: true } });
    return { ok: true };
  });
