import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertUserCreditCard, assertUserFinanceAccount, fetchAuthorizedCardBills } from "@/lib/pluggy.functions";
import { CARD_PROFILES_MIGRATION_MESSAGE, isMissingCardProfileTable } from "./card-profile-status";

const profileSchema = z.object({
  accountId: z.string().min(1).max(200),
  displayName: z.string().trim().max(100).nullable(),
  cardBrand: z.enum(["VISA", "MASTERCARD", "ELO", "AMEX", "HIPERCARD", "OTHER"]).nullable(),
  annualExpenseId: z.string().uuid().nullable(),
});

export const getFinanceAccountProfiles = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await (context.supabase as any).from("finance_account_profiles")
      .select("account_id,display_name,card_brand,annual_expense_id")
      .eq("user_id", context.userId);
    if (error) {
      // Apenas a consulta de perfis pode continuar de modo degradado.
      // Nunca apresentar um vínculo inexistente como confirmado.
      if (isMissingCardProfileTable(error)) return { profiles: [], available: false };
      throw new Error(error.message);
    }
    return { profiles: (data ?? []) as Array<{
      account_id: string; display_name: string | null;
      card_brand: string | null; annual_expense_id: string | null
    }>, available: true };
  });

export const saveFinanceAccountProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => profileSchema.parse(input))
  .handler(async ({ data, context }) => {
    // Verificação de posse do cartão por meio da conexão bancária original.
    const accountType = await assertUserFinanceAccount(context.supabase, context.userId, data.accountId);
    if (accountType === "BANK" && (data.cardBrand || data.annualExpenseId)) throw new Error("Conta bancária não pode ter bandeira ou vínculo de fatura.");
    if (data.annualExpenseId) {
      const { data: annual, error } = await (context.supabase as any).from("annual_expenses")
        .select("id").eq("id", data.annualExpenseId).eq("user_id", context.userId).maybeSingle();
      if (error || !annual) throw new Error("Credor anual não pertence ao usuário.");
    }
    const { error } = await (context.supabase as any).from("finance_account_profiles").upsert({
      user_id: context.userId, account_id: data.accountId,
      display_name: data.displayName || null, card_brand: data.cardBrand,
      annual_expense_id: data.annualExpenseId,
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id,account_id" });
    if (error) {
      if (isMissingCardProfileTable(error)) throw new Error(CARD_PROFILES_MIGRATION_MESSAGE);
      throw new Error(error.message);
    }
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
    await assertUserCreditCard(context.supabase, context.userId, data.accountId);
    const { data: outcome, error } = await (context.supabase as any).rpc("apply_closed_card_invoice", {
      p_account_id: data.accountId, p_period: data.period,
      p_closed_at: data.closedAt, p_due_date: data.dueDate,
      p_amount_cents: data.amountCents, p_origin: "manual",
      p_provider_reference: null,
    });
    if (error) throw new Error(error.message);
    return { ok: true, status: outcome as string };
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
    const { data: profiles, error: profilesError } = await (supabase as any).from("finance_account_profiles")
      .select("account_id,annual_expense_id").eq("user_id", userId).not("annual_expense_id", "is", null);
    if (profilesError) {
      if (isMissingCardProfileTable(profilesError)) throw new Error(CARD_PROFILES_MIGRATION_MESSAGE);
      throw new Error(profilesError.message);
    }
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
          const { data: status, error } = await (supabase as any).rpc("apply_closed_card_invoice", {
            p_account_id: profile.account_id, p_period: period,
            p_closed_at: close, p_due_date: due, p_amount_cents: cents,
            p_origin: "provider", p_provider_reference: bill.id,
          });
          if (error) throw new Error(error.message);
          if (status === "updated") updated++;
          else if (status === "unchanged") unchanged++;
          else skipped++;
        }
      } catch (e) {
        errors.push(e instanceof Error ? e.message : "Falha de conexão com o provedor.");
      }
    }
    return { updated, unchanged, skipped, errors };
  });

/** Correspondências confirmadas (por ID técnico e competência) para abater dupla contagem. */
export const getConfirmedCardInvoiceLinks = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const today = new Date();
    const earliest = new Date(today.getTime() - 62*86400000).toISOString().slice(0,10);
    const latest = new Date(today.getTime() + 31*86400000).toISOString().slice(0,10);
    const { data, error } = await (context.supabase as any).from("finance_card_closed_invoices")
      .select("account_id,annual_expense_id,period,amount_cents")
      .eq("user_id", context.userId).gte("due_date",earliest).lte("due_date",latest);
    if (error) throw new Error(error.message);
    return (data ?? []).filter((x:{annual_expense_id:string|null;period:string})=>x.annual_expense_id && /^[0-9]{4}-(0[1-9]|1[0-2])$/.test(x.period))
      .map((x:{account_id:string;annual_expense_id:string;period:string;amount_cents:number})=>({
        card_id:x.account_id, liability_key:`annual:${x.annual_expense_id}:${Number(x.period.slice(5,7))}`,
        amount_cents:Number(x.amount_cents),
      })) as Array<{card_id:string;liability_key:string;amount_cents:number}>;
  });
