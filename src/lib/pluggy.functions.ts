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
  creditData?: { creditLimit?: number; availableCreditLimit?: number; brand?: string; balanceDueDate?: string } | null;
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

export const getStatement = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { accountId: string; month: string }) => {
    const accountId = String(d.accountId ?? "");
    const month = String(d.month ?? "");
    if (!/^[\w-]{1,80}$/.test(accountId)) throw new Error("Conta inválida");
    if (!/^\d{4}-\d{2}$/.test(month)) throw new Error("Mês inválido");
    return { accountId, month };
  })
  .handler(async ({ data, context }) => {
    const { data: items } = await context.supabase.from("pluggy_items").select("item_id");
    const apiKey = await apiKeyFor(context.userId);
    const acc = await pluggyGet<PAccount & { itemId: string }>(apiKey, `/accounts/${data.accountId}`);
    if (!items?.some((i) => i.item_id === acc.itemId)) throw new Error("Conta não encontrada");
    const [y, m] = data.month.split("-").map(Number);
    const from = `${data.month}-01`;
    const to = new Date(Date.UTC(y!, m!, 0)).toISOString().slice(0, 10);
    const all: PTx[] = [];
    for (let page = 1; page <= 10; page++) {
      const r = await pluggyGet<{ results: PTx[]; totalPages: number }>(apiKey, `/transactions?accountId=${data.accountId}&from=${from}&to=${to}&pageSize=500&page=${page}`);
      all.push(...r.results);
      if (page >= (r.totalPages ?? 1)) break;
    }
    const isCredit = acc.type === "CREDIT";
    const transactions = all
      .map((t) => ({ id: t.id, description: t.description, amount: isCredit ? -t.amount : t.amount, date: t.date, category: t.category ?? "Outros" }))
      .sort((a, b) => b.date.localeCompare(a.date));
    return { transactions, balance: acc.balance };
  });
