import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertUserCreditCard, assertUserFinanceAccount, fetchAuthorizedCardBills } from "@/lib/pluggy.functions";

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
    const accountType = await assertUserFinanceAccount(context.supabase, context.userId, data.accountId);
    if (accountType === "BANK" && (data.cardBrand || data.annualExpenseId)) throw new Error("Conta bancária não pode ter bandeira ou vínculo de fatura.");
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

/**
 * Sincroniza somente faturas que a instituição efetivamente reportou como fechadas.
 * Uma conta não vinculada, um pagamento já registrado ou exercício arquivado nunca é alterado.
 * O mês da competência corresponde ao vencimento.
 */
export const syncProviderClosedCardInvoices = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: profiles, error: profilesError } = await supabase.from("finance_account_profiles")
      .select("account_id,annual_expense_id").eq("user_id", userId).not("annual_expense_id", "is", null);
    if (profilesError) throw new Error(profilesError.message);
    let updated = 0, unchanged = 0, skipped = 0;
    const errors: string[] = [];
    const today = new Date().toISOString().slice(0, 10);
    for (const profile of profiles ?? []) {
      try {
        const providerBills = await fetchAuthorizedCardBills(supabase, userId, profile.account_id);
        for (const bill of providerBills) {
          const close = bill.billClosingDate?.slice(0, 10);
          const due = bill.dueDate?.slice(0, 10);
          if (!close || !due || close > today || !/^\d{4}-\d{2}-\d{2}$/.test(due) ||
              bill.totalAmountCurrencyCode !== "BRL" ||
              !Number.isFinite(bill.totalAmount) || bill.totalAmount < 0) { skipped++; continue; }
          const period = due.slice(0, 7);
          // Somente período recente (últimos 90 dias) e não futuro excessivamente distante.
          const age = (Date.now() - Date.parse(due + "T00:00:00Z")) / 86400000;
          if (age > 90 || age < -60) { skipped++; continue; }
          const cents = Math.round(bill.totalAmount * 100);
          const { data: annual, error: annualError } = await supabase.from("annual_expenses")
            .select("id,year").eq("user_id", userId).eq("id", profile.annual_expense_id).maybeSingle();
          if (annualError || !annual || annual.year !== Number(period.slice(0, 4))) { skipped++; continue; }
          const { data: yr } = await supabase.from("annual_years").select("archived_at")
            .eq("user_id", userId).eq("year", annual.year).maybeSingle();
          if (yr?.archived_at) { skipped++; continue; }
          const { data: existing, error: existingError } = await supabase.from("finance_card_closed_invoices")
            .select("origin,provider_reference,amount_cents").eq("user_id", userId)
            .eq("account_id", profile.account_id).eq("period", period).maybeSingle();
          if (existingError) throw new Error(existingError.message);
          if (existing?.origin === "manual") { skipped++; continue; }
          if (existing?.provider_reference === bill.id && Number(existing.amount_cents) === cents) { unchanged++; continue; }
          const { data: monthBills, error: monthlyError } = await supabase.from("finance_bills")
            .select("id,paid_date").eq("user_id", userId).eq("source_annual_id", annual.id).eq("source_period", period);
          if (monthlyError) throw new Error(monthlyError.message);
          if ((monthBills ?? []).some((m: {paid_date: string | null}) => m.paid_date)) { skipped++; continue; }
          const { error: saveError } = await supabase.from("finance_card_closed_invoices").upsert({
            user_id: userId, account_id: profile.account_id, period, closed_at: close,
            due_date: due, amount_cents: cents, origin: "provider",
            provider_reference: bill.id, annual_expense_id: annual.id,
            updated_at: new Date().toISOString(),
          }, { onConflict: "user_id,account_id,period" });
          if (saveError) throw new Error(saveError.message);
          const { error: annualWriteError } = await supabase.from("annual_expense_months").upsert({
            annual_expense_id: annual.id, month: Number(period.slice(5, 7)), expected_cents: cents,
          }, { onConflict: "annual_expense_id,month" });
          if (annualWriteError) throw new Error(annualWriteError.message);
          if (monthBills?.length) {
            const { error: billWriteError } = await supabase.from("finance_bills")
              .update({ expected_cents: cents, due_date: due })
              .eq("user_id", userId).eq("source_annual_id", annual.id)
              .eq("source_period", period).is("paid_date", null);
            if (billWriteError) throw new Error(billWriteError.message);
          }
          await supabase.rpc("audit_append", { p_action: "sync_closed_card_invoice",
            p_entity_type: "annual_expense", p_entity_id: annual.id,
            p_before: existing ?? null,
            p_after: { period, amount_cents: cents, provider_reference: bill.id },
            p_details: { origin: "provider", account_id: profile.account_id } });
          updated++;
        }
      } catch (e) {
        errors.push(e instanceof Error ? e.message : "Falha de conexão com o provedor.");
      }
    }
    return { updated, unchanged, skipped, errors };
  });
