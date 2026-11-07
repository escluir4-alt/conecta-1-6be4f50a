import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const PLUGGY = "https://api.pluggy.ai";
export type PluggySlot = "primary" | "secondary";
type PluggyItem = { item_id: string; connector_name: string | null; connection_slot: PluggySlot };
const slotLabel = (slot: PluggySlot) => slot === "primary" ? "Meu Pluggy 01" : "Meu Pluggy 02";
async function getItemsForUser(userId: string): Promise<PluggyItem[]> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const {data,error} = await supabaseAdmin.from("pluggy_items")
    .select("*").eq("user_id", userId);
  if(error) throw new Error("Falha ao consultar bancos conectados.");
  return ((data ?? []) as Array<{item_id:string;connector_name:string|null;connection_slot?:PluggySlot}>)
    .map(item=>({...item,connection_slot:item.connection_slot==="secondary"?"secondary":"primary"}));
}


async function getCreds(userId: string, slot: PluggySlot = "primary") {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  if (slot === "secondary") {
    const {data,error} = await (supabaseAdmin as any).from("pluggy_secondary_credentials")
      .select("client_id,client_secret,updated_at").eq("user_id",userId).maybeSingle();
    if(error) throw new Error("A segunda conexão Pluggy precisa da migração do banco.");
    if(!data) throw new Error("Cadastre as credenciais do Meu Pluggy 02.");
    return {clientId:data.client_id as string,clientSecret:data.client_secret as string,custom:true,updatedAt:data.updated_at as string};
  }
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

async function apiKeyFor(userId: string, slot: PluggySlot = "primary") {
  const c = await getCreds(userId, slot);
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
  .inputValidator((d: { slot?: PluggySlot } = {}) => ({ slot: d?.slot === "secondary" ? "secondary" as const : "primary" as const }))
  .handler(async ({ data, context }) => {
    const apiKey = await apiKeyFor(context.userId, data.slot);
    const res = await fetch(`${PLUGGY}/connect_token`, {
      method: "POST",
      headers: { "X-API-KEY": apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({ clientUserId: context.userId }),
    });
    if (!res.ok) throw new Error("Não foi possível iniciar a conexão.");
    const j = (await res.json()) as { accessToken: string };
    return { connectToken: j.accessToken, slot: data.slot };
  });

export const saveItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { itemId: string; connectorName?: string; slot?: PluggySlot }) => {
    if (typeof d?.itemId !== "string" || d.itemId.length > 100) throw new Error("itemId inválido");
    return { itemId: d.itemId, connectorName: String(d.connectorName ?? "").slice(0, 120), slot: d.slot === "secondary" ? "secondary" as const : "primary" as const };
  })
  .handler(async ({ data, context }) => {
    const apiKey = await apiKeyFor(context.userId,data.slot);
    await pluggyGet<PItem>(apiKey,`/items/${encodeURIComponent(data.itemId)}`);
    const previous = (await getItemsForUser(context.userId)).find(i=>i.item_id===data.itemId);
    if (previous && previous.connection_slot !== data.slot) throw new Error("A conexão pertence a outro Meu Pluggy.");
    const {supabaseAdmin}=await import("@/integrations/supabase/client.server");
    const fields:{user_id:string;item_id:string;connector_name:string;connection_slot?:PluggySlot}={
      user_id:context.userId,item_id:data.itemId,connector_name:data.connectorName,connection_slot:data.slot,
    };
    let {error}=await (supabaseAdmin as any).from("pluggy_items").upsert(fields,{onConflict:"user_id,item_id"});
    // Safeguard while older Supabase deployments apply the multi-Pluggy migration.
    if(error && data.slot==="primary" && /connection_slot|schema cache/i.test(error.message)) {
      delete fields.connection_slot;
      ({error}=await (supabaseAdmin as any).from("pluggy_items").upsert(fields,{onConflict:"user_id,item_id"}));
    }
    if(error) throw new Error(error.message);
    return {ok:true};
  });

export const removeItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { itemId: string; slot?: PluggySlot }) => ({ itemId: String(d.itemId), slot: d.slot === "secondary" ? "secondary" as const : "primary" as const }))
  .handler(async ({ data, context }) => {
    const {supabaseAdmin}=await import("@/integrations/supabase/client.server");
    const row=(await getItemsForUser(context.userId)).find(item=>item.item_id===data.itemId);
    if(!row||row.connection_slot!==data.slot) throw new Error("Origem da conta não corresponde à conexão.");
    const {error}=await (supabaseAdmin as any).from("pluggy_items").delete().eq("user_id",context.userId)
      .eq("item_id", data.itemId);
    if(error) throw new Error(error.message);
    return {ok:true};
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
type PTx = { id: string; description: string; amount: number; date: string; type: "DEBIT" | "CREDIT"; category?: string | null; status?: string | null; billId?: string | null; creditCardMetadata?: { installmentNumber?: number | null; totalInstallments?: number | null } | null; installmentNumber?: number | null; totalInstallments?: number | null };

export type FinanceAccount = {
  id: string;
  itemId: string;
  connectionSlot: PluggySlot;
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
export type FinanceTx = { id: string; connectionSlot: PluggySlot; accountId: string; description: string; amount: number; date: string; category: string; account: string; accountType: "BANK" | "CREDIT"; institution: string; logo: string | null; color: string | null };

type PItem = { connector?: { name?: string; imageUrl?: string; primaryColor?: string } };

function isAggregator(name: string) {
  return /pluggy/i.test(name);
}

/**
 * Pluggy v2 pagina por cursor. Não converter a resposta em uma página limitada nem
 * ocultar falhas de acesso ao extrato. O ciclo e limitado apenas para proteger
 * contra cursor repetido pelo provedor.
 */
export function isInstallmentTransaction(tx: PTx): boolean {
  if ((tx.creditCardMetadata?.totalInstallments ?? 0) > 1) return true;
  if ((tx.totalInstallments ?? 0) > 1) return true;
  const description = tx.description ?? "";
  // Detecta marcadores explícitos de parcela, não compras que só contêm números.
  return /(?:parc(?:ela)?\.?\s*\d{1,3}\s*(?:\/|de)\s*\d{1,3}|\b\d{1,3}\s*\/\s*\d{1,3}\s*(?:parc(?:ela)?)?\b|parcelamento\s+(?:de\s+)?(?:fatura|compra))/i.test(description);
}
async function getAllPluggyTransactions(apiKey: string, accountId: string, from?: string, to?: string): Promise<PTx[]> {
  const query = new URLSearchParams({ accountId });
  if (from) query.set("dateFrom", from);
  if (to) query.set("dateTo", to);
  const seenCursors = new Set<string>();
  const seenIds = new Set<string>();
  const entries: PTx[] = [];
  let path = `/v2/transactions?${query.toString()}`;
  for (let page = 0; page < 1000; page++) {
    const response = await pluggyGet<{ results: PTx[]; next?: string | null }>(apiKey, path);
    for (const tx of response.results ?? []) {
      if (!tx.id || seenIds.has(tx.id)) continue;
      seenIds.add(tx.id);
      entries.push(tx);
    }
    if (!response.next) return entries;
    const next = response.next.startsWith("?") ? `/v2/transactions${response.next}` :
      response.next.startsWith("/v2/transactions?") ? response.next : null;
    if (!next || seenCursors.has(next)) throw new Error("Paginação inesperada de transações pela instituição.");
    seenCursors.add(next);
    path = next;
  }
  throw new Error("Volume de transações excedeu a capacidade de sincronização desta solicitação.");
}

export const getFinances = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const items = await getItemsForUser(context.userId);
    if (items.length === 0) return {accounts:[] as FinanceAccount[],transactions:[] as FinanceTx[],error:null as string|null};
    const keys = new Map<PluggySlot,string>();
    const connectionErrors:string[]=[];
    for (const slot of ["primary","secondary"] as const) {
      if(!items.some(item=>item.connection_slot===slot)) continue;
      try { keys.set(slot,await apiKeyFor(context.userId,slot)); }
      catch(error){connectionErrors.push(`${slotLabel(slot)}: ${error instanceof Error?error.message:"Falha na autenticação"}`);}
    }
    const accounts: FinanceAccount[] = [];
    const transactions: FinanceTx[] = [];
    const accountErrors: string[] = [...connectionErrors];
    const from = new Date(Date.now() - 365 * 86400000).toISOString().slice(0, 10);
    for (const it of items) {
      const apiKey=keys.get(it.connection_slot);
      if(!apiKey) continue;
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
            connectionSlot: it.connection_slot,
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
          try {
            const entries = await getAllPluggyTransactions(apiKey, a.id, from);
            for (const t of entries) {
              if (isInstallmentTransaction(t)) continue;
              transactions.push({
                id: t.id, connectionSlot: it.connection_slot, accountId: a.id, description: t.description,
                amount: isCredit ? -t.amount : t.amount,
                date: t.date, category: t.category ?? "Outros",
                account: a.marketingName || a.name, accountType: a.type,
                institution, logo, color,
              });
            }
          } catch (txError) {
            accountErrors.push(`${institution}: ${txError instanceof Error ? txError.message : "Extrato indisponível"}`);
          }
        }
      } catch (error) {
        accountErrors.push(error instanceof Error ? error.message : "Erro ao consultar conta conectada");
      }
    }
    transactions.sort((a, b) => b.date.localeCompare(a.date));
    return { accounts, transactions, error: accountErrors.length ? `Alguns extratos não foram recuperados: ${accountErrors.join("; ")}. Confira as autorizações da Pluggy.` : null };
  });

export const getCredentialStatus = createServerFn({method:"GET"})
  .middleware([requireSupabaseAuth])
  .inputValidator((d: {slot?: PluggySlot} = {}) => ({slot:d?.slot==="secondary"?"secondary" as const:"primary" as const}))
  .handler(async ({data,context}) => {
    try {
      const c=await getCreds(context.userId,data.slot);
      return {slot:data.slot,configured:!!c.clientId&&!!c.clientSecret,
        clientId:c.clientId,custom:c.custom,updatedAt:c.updatedAt,
        secretHint:c.clientSecret?"••••"+c.clientSecret.slice(-4):""};
    } catch(e) {
      if(data.slot==="secondary"&&(e as Error).message.includes("Cadastre")) {
        return {slot:data.slot,configured:false,clientId:"",custom:true,updatedAt:null as string|null,secretHint:""};
      }
      throw e;
    }
  });
export const updateCredentials = createServerFn({method:"POST"})
  .middleware([requireSupabaseAuth])
  .inputValidator((d: {clientId:string;clientSecret:string;slot?:PluggySlot}) => {
    const clientId=String(d.clientId??"").trim();
    const clientSecret=String(d.clientSecret??"").trim();
    if(clientId.length<8||clientId.length>100) throw new Error("Client ID inválido");
    if(clientSecret.length<8||clientSecret.length>200) throw new Error("Client Secret inválido");
    return {clientId,clientSecret,slot:d.slot==="secondary"?"secondary" as const:"primary" as const};
  })
  .handler(async ({data,context}) => {
    const res=await fetch(`${PLUGGY}/auth`,{method:"POST",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify({clientId:data.clientId,clientSecret:data.clientSecret})});
    if(!res.ok) throw new Error("A Pluggy recusou as credenciais desta aplicação.");
    const existing=(await getItemsForUser(context.userId)).filter(i=>i.connection_slot===data.slot);
    if(existing.length) {
      const previous=await getCreds(context.userId,data.slot);
      if(previous.clientId!==data.clientId) {
        throw new Error("Esta origem possui bancos conectados. Não é possível trocar o Client ID sem remover ou migrar as conexões.");
      }
    }
    const {supabaseAdmin}=await import("@/integrations/supabase/client.server");
    const table=data.slot==="secondary"?"pluggy_secondary_credentials":"pluggy_credentials";
    const {error}=await (supabaseAdmin as any).from(table).upsert({
      user_id:context.userId,client_id:data.clientId,client_secret:data.clientSecret,
      updated_at:new Date().toISOString(),
    },{onConflict:"user_id"});
    if(error) throw new Error(error.message);
    return {ok:true,slot:data.slot};
  });


export type CardStatementTransaction = { id: string; description: string; amount: number; date: string; category: string };
export type CardStatementResult = {
  transactions: CardStatementTransaction[];
  balance: number;
  source: "open-finance" | "saved";
  capturedAt: string | null;
  historyAvailable: boolean;
  invoice: { amount: number; closingDate: string | null; dueDate: string | null; id: string | null } | null;
  limits: { total: number | null; available: number | null; used: number | null } | null;
};
async function resolveUserAccount(userId:string,accountId:string):Promise<{account:PAccount & {itemId:string};apiKey:string;slot:PluggySlot}> {
  const items=await getItemsForUser(userId);
  const keys=new Map<PluggySlot,string>();
  for(const slot of ["primary","secondary"] as const) {
    if(!items.some(i=>i.connection_slot===slot)) continue;
    try {keys.set(slot,await apiKeyFor(userId,slot));}catch {continue;}
  }
  for(const item of items) {
    const key=keys.get(item.connection_slot);
    if(!key) continue;
    try {
      const account=await pluggyGet<PAccount & {itemId:string}>(key,`/accounts/${encodeURIComponent(accountId)}`);
      if(account.itemId===item.item_id) return {account,apiKey:key,slot:item.connection_slot};
    } catch { /* another Pluggy application may not know this ID */ }
  }
  throw new Error("Conta não encontrada nas conexões Pluggy autorizadas.");
}

export const getStatement = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { accountId: string; month: string }) => {
    const accountId = String(d.accountId ?? "");
    const month = String(d.month ?? "");
    if (!/^[\w-]{1,80}$/.test(accountId)) throw new Error("Conta inválida");
    if (!/^[0-9]{4}-(0[1-9]|1[0-2])$/.test(month)) throw new Error("Competência inválida");
    return { accountId, month };
  })
  .handler(async ({ data, context }): Promise<CardStatementResult> => {
    // Verificar titularidade antes de ler o cache persistente.
    const resolved=await resolveUserAccount(context.userId,data.accountId);
    const key=resolved.apiKey;
    const acc=resolved.account;
    const [year, month] = data.month.split("-").map(Number);
    const from = `${data.month}-01`;
    const to = new Date(Date.UTC(year!, month!, 0)).toISOString().slice(0, 10);
    const saved = await (context.supabase as any).from("finance_card_month_snapshots")
      .select("*").eq("user_id", context.userId).eq("account_id", data.accountId)
      .eq("period", data.month).maybeSingle();
    // Compatibilidade durante implantação: a falta da migration não bloqueia consulta ao banco.
    const historyAvailable = !saved.error;
    try {
      const all = await getAllPluggyTransactions(key, data.accountId, from, to);
      const credit = acc.type === "CREDIT";
      const transactions = all.filter(t => !isInstallmentTransaction(t)).map(t => ({ id: t.id, description: t.description,
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
      if (historyAvailable) {
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
      // Extrato vazio é dado válido. Não substituí-lo por cache antigo sem erro real.
      return { transactions, balance: acc.balance, source:"open-finance", capturedAt: new Date().toISOString(), historyAvailable,
        invoice: invoice ?? (saved.data?.invoice_cents != null ? {
          amount: saved.data.invoice_cents/100, closingDate: saved.data.closing_date,
          dueDate: saved.data.due_date, id: saved.data.provider_invoice_id } : null),
        limits: limits ?? (saved.data?.total_limit_cents != null ? {
          total:saved.data.total_limit_cents/100, available:saved.data.available_limit_cents/100,
          used:saved.data.used_limit_cents/100 } : null) };
    } catch (e) {
      if (!saved.data) throw e;
      return { transactions: saved.data.transactions as CardStatementTransaction[],
        balance: acc.balance, source:"saved", capturedAt:saved.data.captured_at, historyAvailable,
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
export async function assertUserCreditCard(supabase:any,userId:string,accountId:string):Promise<void> {
  const result=await resolveUserAccount(userId,accountId);
  if(result.account.type!=="CREDIT") throw new Error("Conta não é cartão de crédito autorizado.");
}
export async function assertUserFinanceAccount(supabase:any,userId:string,accountId:string):Promise<"BANK"|"CREDIT"> {
  const result=await resolveUserAccount(userId,accountId);
  return result.account.type;
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
  const {apiKey}=await resolveUserAccount(userId,accountId);
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
