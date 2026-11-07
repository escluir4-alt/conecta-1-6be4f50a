import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const PLUGGY = "https://api.pluggy.ai";

async function getCreds(userId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("pluggy_credentials")
    .select("client_id, client_secret, updated_at")
    .eq("user_id", userId)
    .maybeSingle();
  if (data) return { clientId: data.client_id, clientSecret: data.client_secret, custom: true, updatedAt: data.updated_at };
  return {
    clientId: process.env["PLUGGY_CLIENT_ID"] ?? "",
    clientSecret: process.env["PLUGGY_CLIENT_SECRET"] ?? "",
    custom: false,
    updatedAt: null as string | null,
  };
}

async function apiKeyFor(userId: string) {
  const c = await getCreds(userId);
  const res = await fetch(`${PLUGGY}/auth`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ clientId: c.clientId, clientSecret: c.clientSecret }),
  });
  if (!res.ok) throw new Error("Credenciais Pluggy inválidas. Verifique o Client ID e Client Secret.");
  const j = (await res.json()) as { apiKey: string };
  return j.apiKey;
}

async function pluggyGet<T>(apiKey: string, path: string): Promise<T> {
  const res = await fetch(`${PLUGGY}${path}`, { headers: { "X-API-KEY": apiKey } });
  if (!res.ok) throw new Error(`Erro Pluggy (${res.status})`);
  return (await res.json()) as T;
}

export const createConnectToken = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const apiKey = await apiKeyFor(context.userId);
    const res = await fetch(`${PLUGGY}/connect_token`, {
      method: "POST",
      headers: { "X-API-KEY": apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({ clientUserId: context.userId }),
    });
    if (!res.ok) throw new Error("Não foi possível iniciar a conexão.");
    const j = (await res.json()) as { accessToken: string };
    return { connectToken: j.accessToken };
  });

export const saveItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { itemId: string; connectorName?: string }) => {
    if (typeof d?.itemId !== "string" || d.itemId.length > 100) throw new Error("itemId inválido");
    return { itemId: d.itemId, connectorName: String(d.connectorName ?? "").slice(0, 120) };
  })
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("pluggy_items")
      .upsert({ user_id: context.userId, item_id: data.itemId, connector_name: data.connectorName }, { onConflict: "user_id,item_id" });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const removeItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { itemId: string }) => ({ itemId: String(d.itemId) }))
  .handler(async ({ data, context }) => {
    await context.supabase.from("pluggy_items").delete().eq("item_id", data.itemId);
    return { ok: true };
  });

type PAccount = {
  id: string;
  type: "BANK" | "CREDIT";
  subtype: string;
  name: string;
  marketingName?: string | null;
  number?: string;
  balance: number;
  currencyCode: string;
  creditData?: { creditLimit?: number; availableCreditLimit?: number; brand?: string; balanceDueDate?: string; balanceCloseDate?: string } | null;
};
type PTx = { id: string; description: string; amount: number; date: string; type: "DEBIT" | "CREDIT"; category?: string | null };

export type FinanceAccount = {
  id: string;
  itemId: string;
  institution: string;
  logo: string | null;
  color: string | null;
  type: "BANK" | "CREDIT";
  name: string;
  number: string;
  balance: number;
  creditLimit: number;
  available: number;
  brand: string;
  dueDate: string | null;
  closingDate: string | null;
};
export type FinanceTx = { id: string; description: string; amount: number; date: string; category: string; account: string; accountType: "BANK" | "CREDIT"; institution: string; logo: string | null; color: string | null };

type PItem = { connector?: { name?: string; imageUrl?: string; primaryColor?: string } };

function isAggregator(name: string) {
  return /pluggy/i.test(name);
}

export const getFinances = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: items } = await context.supabase.from("pluggy_items").select("item_id, connector_name");
    if (!items || items.length === 0) return { accounts: [] as FinanceAccount[], transactions: [] as FinanceTx[], error: null as string | null };
    let apiKey: string;
    try {
      apiKey = await apiKeyFor(context.userId);
    } catch (e) {
      return { accounts: [], transactions: [], error: (e as Error).message };
    }
    const accounts: FinanceAccount[] = [];
    const transactions: FinanceTx[] = [];
    const accountErrors: string[] = [];
    const from = new Date(Date.now() - 60 * 86400000).toISOString().slice(0, 10);
    for (const it of items) {
      try {
        const item = await pluggyGet<PItem>(apiKey, `/items/${encodeURIComponent(it.item_id)}`).catch(() => ({} as PItem));
        const connName = item.connector?.name || it.connector_name || "Banco";
        const agg = isAggregator(connName);
        const { results } = await pluggyGet<{ results: PAccount[] }>(apiKey, `/accounts?itemId=${encodeURIComponent(it.item_id)}`);
        for (const a of results) {
          const isCredit = a.type === "CREDIT";
          const institution = agg ? (a.marketingName || a.name) : connName;
          const logo = agg ? null : item.connector?.imageUrl ?? null;
          const color = agg ? null : item.connector?.primaryColor ? `#${item.connector.primaryColor.replace("#", "")}` : null;
          accounts.push({
            id: a.id,
            itemId: it.item_id,
            institution,
            logo,
            color,
            type: a.type,
            name: a.marketingName || a.name,
            number: (a.number ?? "").slice(-4),
            balance: a.balance,
            creditLimit: a.creditData?.creditLimit ?? 0,
            available: a.creditData?.availableCreditLimit ?? 0,
            brand: a.creditData?.brand ?? "",
            dueDate: a.creditData?.balanceDueDate ?? null,
            closingDate: a.creditData?.balanceCloseDate ?? null,
          });
          const tx = await pluggyGet<{ results: PTx[] }>(apiKey, `/transactions?accountId=${a.id}&from=${from}&pageSize=50`).catch(() => ({ results: [] as PTx[] }));
          for (const t of tx.results) {
            transactions.push({
              id: t.id,
              description: t.description,
              amount: isCredit ? -t.amount : t.amount,
              date: t.date,
              category: t.category ?? "Outros",
              account: a.marketingName || a.name,
              accountType: a.type,
              institution,
              logo,
              color,
            });
          }
        }
      } catch (error) {
        accountErrors.push(error instanceof Error ? error.message : "Erro ao consultar conta conectada");
      }
    }
    transactions.sort((a, b) => b.date.localeCompare(a.date));
    return { accounts, transactions: transactions.slice(0, 40), error: accountErrors.length ? `Não foi possível consultar ${accountErrors.length} conexão(ões) bancária(s). Atualize ou reconecte os bancos antes de calcular o consolidado.` : null };
  });

export const getCredentialStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const c = await getCreds(context.userId);
    return { clientId: c.clientId, custom: c.custom, updatedAt: c.updatedAt, secretHint: c.clientSecret ? "••••" + c.clientSecret.slice(-4) : "" };
  });

export const updateCredentials = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { clientId: string; clientSecret: string }) => {
    const clientId = String(d.clientId ?? "").trim();
    const clientSecret = String(d.clientSecret ?? "").trim();
    if (clientId.length < 8 || clientId.length > 100) throw new Error("Client ID inválido");
    if (clientSecret.length < 8 || clientSecret.length > 200) throw new Error("Client Secret inválido");
    return { clientId, clientSecret };
  })
  .handler(async ({ data, context }) => {
    const res = await fetch(`${PLUGGY}/auth`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error("A Pluggy recusou essas credenciais. Confira e tente de novo.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("pluggy_credentials").upsert({
      user_id: context.userId,
      client_id: data.clientId,
      client_secret: data.clientSecret,
      updated_at: new Date().toISOString(),
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export type CardStatementTransaction = { id: string; description: string; amount: number; date: string; category: string };
export type CardStatementResult = {
  transactions: CardStatementTransaction[];
  balance: number;
  source: "open-finance" | "saved";
  capturedAt: string | null;
  invoice: { amount: number; closingDate: string | null; dueDate: string | null; id: string | null } | null;
  limits: { total: number | null; available: number | null; used: number | null } | null;
};
export const getStatement = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { accountId: string; month: string }) => {
    const accountId = String(d.accountId ?? "");
    const month = String(d.month ?? "");
    if (!/^[\\w-]{1,80}$/.test(accountId)) throw new Error("Conta inválida");
    if (!/^[0-9]{4}-(0[1-9]|1[0-2])$/.test(month)) throw new Error("Competência inválida");
    return { accountId, month };
  })
  .handler(async ({ data, context }): Promise<CardStatementResult> => {
    // Verificar titularidade antes de ler o cache persistente.
    const { data: items, error: itemsError } = await context.supabase.from("pluggy_items")
      .select("item_id").eq("user_id", context.userId);
    if (itemsError || !items?.length) throw new Error("Nenhuma conta autorizada.");
    const key = await apiKeyFor(context.userId);
    const acc = await pluggyGet<PAccount & { itemId: string }>(key, `/accounts/${encodeURIComponent(data.accountId)}`);
    if (!items.some(i => i.item_id === acc.itemId)) throw new Error("Conta não autorizada.");
    const [year, month] = data.month.split("-").map(Number);
    const from = `${data.month}-01`;
    const to = new Date(Date.UTC(year!, month!, 0)).toISOString().slice(0, 10);
    const saved = await (context.supabase as any).from("finance_card_month_snapshots")
      .select("*").eq("user_id", context.userId).eq("account_id", data.accountId)
      .eq("period", data.month).maybeSingle();
    if (saved.error) throw new Error("Histórico de cartões indisponível: aplique a migração de snapshots.");
    try {
      const all: PTx[] = [];
      for (let page = 1; page <= 10; page++) {
        const response = await pluggyGet<{ results: PTx[]; totalPages: number }>(key,
          `/transactions?accountId=${encodeURIComponent(data.accountId)}&from=${from}&to=${to}&pageSize=500&page=${page}`);
        all.push(...response.results);
        if (page >= (response.totalPages ?? 1)) break;
      }
      const credit = acc.type === "CREDIT";
      const transactions = all.map(t => ({ id: t.id, description: t.description,
        amount: credit ? -t.amount : t.amount, date: t.date, category: t.category ?? "Outros" }))
        .sort((a,b) => b.date.localeCompare(a.date));
      let invoice: CardStatementResult["invoice"] = null;
      if (credit) {
        const bills = await pluggyGet<{ results: PluggyCardBill[]; totalPages?: number }>(
          key, `/bills?accountId=${encodeURIComponent(data.accountId)}&pageSize=100`
        ).catch(() => ({ results: [] as PluggyCardBill[] }));
        const bill = bills.results.find(b => b.dueDate?.startsWith(data.month) && b.totalAmountCurrencyCode === "BRL");
        if (bill) invoice = { amount: bill.totalAmount, closingDate: bill.billClosingDate?.slice(0,10) ?? null,
          dueDate: bill.dueDate.slice(0,10), id: bill.id };
      }
      const total = credit ? acc.creditData?.creditLimit ?? null : null;
      const available = credit ? acc.creditData?.availableCreditLimit ?? null : null;
      const isCurrent = data.month === new Date().toISOString().slice(0,7);
      const limits = credit && isCurrent ? { total, available,
        used: total !== null && available !== null ? Math.max(0,total-available) : null } : null;
      if (credit && (transactions.length > 0 || invoice)) {
        const { error } = await (context.supabase as any).from("finance_card_month_snapshots").upsert({
          user_id: context.userId, account_id: data.accountId, period: data.month,
          transactions, total_limit_cents: limits?.total == null ? saved.data?.total_limit_cents ?? null : Math.round(limits.total*100),
          available_limit_cents: limits?.available == null ? saved.data?.available_limit_cents ?? null : Math.round(limits.available*100),
          used_limit_cents: limits?.used == null ? saved.data?.used_limit_cents ?? null : Math.round(limits.used*100),
          closing_date: invoice?.closingDate ?? saved.data?.closing_date ?? null,
          due_date: invoice?.dueDate ?? saved.data?.due_date ?? null,
          invoice_cents: invoice ? Math.round(invoice.amount*100) : saved.data?.invoice_cents ?? null,
          provider_invoice_id: invoice?.id ?? saved.data?.provider_invoice_id ?? null,
          captured_at: new Date().toISOString(),
        }, { onConflict: "user_id,account_id,period" });
        if (error) throw new Error("Falha ao preservar o histórico: "+error.message);
      }
      if (!transactions.length && !invoice && saved.data) throw new Error("Dados indisponíveis no provedor.");
      return { transactions, balance: acc.balance, source:"open-finance", capturedAt: new Date().toISOString(),
        invoice: invoice ?? (saved.data?.invoice_cents != null ? {
          amount: saved.data.invoice_cents/100, closingDate: saved.data.closing_date,
          dueDate: saved.data.due_date, id: saved.data.provider_invoice_id } : null),
        limits: limits ?? (saved.data?.total_limit_cents != null ? {
          total:saved.data.total_limit_cents/100, available:saved.data.available_limit_cents/100,
          used:saved.data.used_limit_cents/100 } : null) };
    } catch (e) {
      if (!saved.data) throw e;
      return { transactions: saved.data.transactions as CardStatementTransaction[],
        balance: acc.balance, source:"saved", capturedAt:saved.data.captured_at,
        invoice: saved.data.invoice_cents == null ? null : {
          amount: saved.data.invoice_cents/100, closingDate: saved.data.closing_date,
          dueDate: saved.data.due_date, id: saved.data.provider_invoice_id },
        limits: saved.data.total_limit_cents == null ? null : {
          total:saved.data.total_limit_cents/100, available:saved.data.available_limit_cents/100,
          used:saved.data.used_limit_cents/100 },
      };
    }
  });

/**
 * Valida propriedade do cartão usando o inventário de conexões do usuário.
 * Nunca confiar apenas no accountId enviado pelo navegador.
 */
export async function assertUserCreditCard(
  supabase: any,
  userId: string,
  accountId: string,
): Promise<void> {
  const { data: items, error } = await supabase.from("pluggy_items")
    .select("item_id").eq("user_id", userId);
  if (error) throw new Error("Não foi possível conferir a propriedade do cartão.");
  if (!items?.length) throw new Error("Nenhum cartão conectado foi encontrado.");
  const apiKey = await apiKeyFor(userId);
  for (const item of items) {
    const response = await pluggyGet<{ results: Array<{ id: string; type: string }> }>(
      apiKey, `/accounts?itemId=${encodeURIComponent(item.item_id)}`
    );
    if (response.results.some(a => a.id === accountId && a.type === "CREDIT")) return;
  }
  throw new Error("Cartão não pertence às conexões de crédito autorizadas.");
}

/** Valida qualquer conta ou cartão vinculado a uma conexão do titular. */
export async function assertUserFinanceAccount(supabase: any, userId: string, accountId: string): Promise<"BANK" | "CREDIT"> {
  const { data: items, error } = await supabase.from("pluggy_items").select("item_id").eq("user_id", userId);
  if (error) throw new Error("Falha ao verificar contas autorizadas.");
  if (!items?.length) throw new Error("Nenhuma conexão autorizada.");
  const apiKey = await apiKeyFor(userId);
  for (const item of items) {
    const response = await pluggyGet<{ results: Array<{ id: string; type: string }> }>(
      apiKey, `/accounts?itemId=${encodeURIComponent(item.item_id)}`
    );
    const account = response.results.find(a => a.id === accountId);
    if (account?.type === "BANK" || account?.type === "CREDIT") return account.type;
  }
  throw new Error("Conta não pertence às conexões autorizadas.");
}

/** Faturas oficiais; nunca inferir fechamento a partir do limite disponível. */
export type PluggyCardBill = {
  id: string;
  dueDate: string;
  billClosingDate: string | null;
  totalAmount: number;
  totalAmountCurrencyCode: string;
};
export async function fetchAuthorizedCardBills(supabase: any, userId: string, accountId: string): Promise<PluggyCardBill[]> {
  await assertUserCreditCard(supabase, userId, accountId);
  const apiKey = await apiKeyFor(userId);
  const results: PluggyCardBill[] = [];
  for (let page = 1; page <= 3; page++) {
    const response = await pluggyGet<{ results: PluggyCardBill[]; totalPages?: number }>(
      apiKey, `/bills?accountId=${encodeURIComponent(accountId)}&pageSize=100&page=${page}`
    );
    results.push(...(response.results ?? []));
    if (!response.totalPages || page >= response.totalPages) break;
  }
  return results;
}
