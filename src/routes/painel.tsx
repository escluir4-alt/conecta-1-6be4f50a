import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  CreditCard, Wallet, Gauge, Receipt, Plus, LayoutGrid, LogOut, KeyRound, MoreVertical, RefreshCw, Landmark, ChevronLeft, ChevronRight, Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AppShell } from "@/components/AppShell";
import {
  createConnectToken, getCredentialStatus, getFinances, getStatement, removeItem, saveItem, updateCredentials,
  type FinanceAccount,
} from "@/lib/pluggy.functions";

export const Route = createFileRoute("/painel")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Contas e Cartões — Casa Clara" },
      { name: "description", content: "Suas contas, cartões e movimentações financeiras em um só lugar." },
      { property: "og:title", content: "Contas e Cartões — Casa Clara" },
      { property: "og:description", content: "Suas contas, cartões e movimentações em um só lugar." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Painel,
});

const brl = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

declare global {
  interface Window {
    PluggyConnect?: new (opts: Record<string, unknown>) => { init: () => void };
  }
}

function loadPluggyScript() {
  return new Promise<void>((resolve, reject) => {
    if (window.PluggyConnect) return resolve();
    const s = document.createElement("script");
    s.src = "https://cdn.pluggy.ai/pluggy-connect/v2.8.2/pluggy-connect.js";
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Falha ao carregar o Pluggy Connect"));
    document.body.appendChild(s);
  });
}

function Painel() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [user, setUser] = useState<{ email: string; name: string } | null>(null);
  const [secretOpen, setSecretOpen] = useState(false);
  const [selectedCard, setSelectedCard] = useState<string | null>(null);
  const [statementAcc, setStatementAcc] = useState<FinanceAccount | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) navigate({ to: "/" });
      else setUser({ email: data.user.email ?? "", name: (data.user.user_metadata?.["full_name"] as string) || (data.user.email ?? "") });
    });
    const { data: sub } = supabase.auth.onAuthStateChange((e) => {
      if (e === "SIGNED_OUT") navigate({ to: "/", replace: true });
    });
    return () => sub.subscription.unsubscribe();
  }, [navigate]);

  const fetchFin = useServerFn(getFinances);
  const tokenFn = useServerFn(createConnectToken);
  const saveFn = useServerFn(saveItem);
  const removeFn = useServerFn(removeItem);

  const q = useQuery({ queryKey: ["finances"], queryFn: () => fetchFin(), enabled: !!user });
  const accounts = q.data?.accounts ?? [];
  const txs = q.data?.transactions ?? [];
  const banks = accounts.filter((a) => a.type === "BANK");
  const cards = accounts.filter((a) => a.type === "CREDIT");
  const selCard = cards.find((c) => c.id === selectedCard) ?? cards[0];

  const stats = useMemo(() => {
    const saldo = banks.reduce((s, a) => s + a.balance, 0);
    const limite = cards.reduce((s, a) => s + a.creditLimit, 0);
    const usado = cards.reduce((s, a) => s + Math.max(0, a.creditLimit - a.available), 0);
    const fatura = cards.reduce((s, a) => s + a.balance, 0);
    return { saldo, limite, usado, fatura, pct: limite ? Math.round((usado / limite) * 100) : 0 };
  }, [banks, cards]);

  async function connect() {
    try {
      const [{ connectToken }] = await Promise.all([tokenFn(), loadPluggyScript()]);
      const widget = new window.PluggyConnect!({
        connectToken,
        includeSandbox: true,
        onSuccess: async (data: { item: { id: string; connector?: { name?: string } } }) => {
          await saveFn({ data: { itemId: data.item.id, connectorName: data.item.connector?.name ?? "" } });
          toast.success("Banco conectado! Sincronizando seus dados…");
          qc.invalidateQueries({ queryKey: ["finances"] });
        },
        onError: () => toast.error("A conexão com o banco não foi concluída."),
      });
      widget.init();
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  async function disconnect(itemId: string) {
    await removeFn({ data: { itemId } });
    toast.success("Conexão removida.");
    qc.invalidateQueries({ queryKey: ["finances"] });
  }

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/", replace: true });
  }

  return (
    <AppShell
      active="carteira"
      user={user}
      headerActions={
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" aria-label="Menu de ações"><MoreVertical /></Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-60">
              <DropdownMenuLabel>Ações</DropdownMenuLabel>
              <DropdownMenuItem onClick={connect}><Plus />Conectar banco</DropdownMenuItem>
              <DropdownMenuItem onClick={() => qc.invalidateQueries({ queryKey: ["finances"] })}><RefreshCw />Atualizar dados</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSecretOpen(true)}><KeyRound />Alterar Client Secret</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={signOut}><LogOut />Sair</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
      }
    >


        <div className="p-6 lg:p-8">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Contas e cartões</div>
              <h1 className="text-3xl font-extrabold">Contas e Cartões</h1>
              <p className="text-sm text-muted-foreground">Suas contas, cartões e movimentações financeiras em um só lugar.</p>
            </div>
            <Button variant="brand" className="h-11" onClick={connect}><Plus />Adicionar conta ou cartão</Button>
          </div>

          {q.data?.error && (
            <div className="mt-6 rounded-xl border border-destructive/30 bg-danger-soft p-4 text-sm">
              {q.data.error}{" "}
              <button className="font-semibold underline" onClick={() => setSecretOpen(true)}>Alterar credenciais</button>
            </div>
          )}

          <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Kpi icon={Wallet} label="Saldo total" value={brl(stats.saldo)} sub={`em ${banks.length} contas`} />
            <Kpi icon={CreditCard} label="Limite total (cartões)" value={brl(stats.limite)} sub={`em ${cards.length} cartões`} />
            <div className="rounded-2xl border bg-card p-5 shadow-soft">
              <div className="flex items-center gap-2 text-sm font-medium"><Gauge className="size-4 text-primary" />Limite utilizado</div>
              <div className="mt-3 flex items-center gap-4">
                <div className="grid size-20 place-items-center rounded-full font-bold" style={{ background: `conic-gradient(var(--primary) ${stats.pct * 3.6}deg, var(--muted) 0)` }}>
                  <div className="grid size-14 place-items-center rounded-full bg-card text-sm">{stats.pct}%</div>
                </div>
                <div><div className="font-bold">{brl(stats.usado)}</div><div className="text-xs text-muted-foreground">de {brl(stats.limite)}</div></div>
              </div>
            </div>
            <Kpi icon={Receipt} label="Faturas atuais" value={brl(stats.fatura)} sub="soma das faturas abertas" />
          </div>

          {q.isLoading ? (
            <div className="mt-10 text-center text-muted-foreground">Carregando seus dados…</div>
          ) : accounts.length === 0 ? (
            <div className="mt-8 rounded-2xl border border-dashed bg-card p-12 text-center">
              <Landmark className="mx-auto size-10 text-primary" />
              <h2 className="mt-4 text-xl font-bold">Conecte seu primeiro banco</h2>
              <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
                Pelo Open Finance você autoriza o acesso com segurança e vê saldos, cartões e movimentações aqui.
              </p>
              <Button variant="brand" className="mt-6 h-11" onClick={connect}><Plus />Conectar banco</Button>
            </div>
          ) : (
            <div className="mt-6 grid gap-6 xl:grid-cols-3">
              <Panel title="Contas cadastradas">
                {banks.length === 0 && <Empty text="Nenhuma conta corrente." />}
                {banks.map((a) => (
                  <Row key={a.id} acc={a} title={a.institution} sub={`Open Finance • ${/poupan/i.test(a.name) ? "Poupança" : "Conta corrente"}`} right={<span className={`font-bold ${a.balance >= 0 ? "text-success" : "text-destructive"}`}>{brl(a.balance)}</span>} onClick={() => setStatementAcc(a)} onRemove={() => disconnect(a.id)} />
                ))}
              </Panel>

              <Panel title="Cartões cadastrados">
                {cards.length === 0 && <Empty text="Nenhum cartão." />}
                {selCard && (
                  <button onClick={() => setStatementAcc(selCard)} className="mb-3 block w-full rounded-2xl p-5 text-left text-primary-foreground shadow-soft transition hover:opacity-95" style={{ background: "linear-gradient(135deg, #0d6c7b 0%, #084f64 100%)" }}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <BankLogo acc={selCard} size="size-9" />
                        <span className="font-semibold">{selCard.name}</span>
                      </div>
                      <BrandMark brand={selCard.brand} />
                    </div>
                    <div className="mt-6 flex items-end justify-between text-sm">
                      <div>
                        <div className="h-6 w-8 rounded-md bg-primary-foreground/30" />
                        <div className="mt-2 opacity-90">Fatura {brl(selCard.balance)}</div>
                      </div>
                      <div className="text-right opacity-90">
                        <div>•••• {selCard.number}</div>
                        {selCard.dueDate && <div className="text-xs">Vence {new Date(selCard.dueDate).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}</div>}
                      </div>
                    </div>
                  </button>
                )}
                {cards.filter((c) => c.id !== selCard?.id).map((c) => (
                  <Row key={c.id} acc={c} title={c.name} sub={`•••• ${c.number}`} right={<span className="grid h-9 w-14 place-items-center rounded-lg bg-muted"><BrandMark brand={c.brand} /></span>} onClick={() => setStatementAcc(c)} onRemove={() => disconnect(c.id)} />
                ))}
              </Panel>

              <Panel title="Últimas movimentações de contas">
                {txs.length === 0 && <Empty text="Sem movimentações recentes." />}
                {txs.slice(0, 8).map((t) => {
                  const credit = t.accountType === "CREDIT";
                  const income = t.amount >= 0;
                  return (
                    <div key={t.id} className="flex items-center gap-3 py-3">
                      <BankLogo acc={{ institution: t.institution, logo: t.logo, color: t.color }} />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-semibold">{t.description}</div>
                        <div className="truncate text-xs text-muted-foreground">{t.account}</div>
                        <div className="text-xs text-muted-foreground">{relDate(t.date)}</div>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <div className={`text-sm font-bold ${income ? "text-success" : "text-destructive"}`}>{income ? "+ " : "- "}{brl(Math.abs(t.amount))}</div>
                        <span className={`rounded-md px-2 py-0.5 text-xs font-medium ${income ? "bg-success-soft text-success" : "bg-danger-soft text-destructive"}`}>
                          {income ? "Receita" : credit ? "Cartão de crédito" : "Débito em conta"}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </Panel>
            </div>
          )}
        </div>
      <StatementDialog acc={statementAcc} onClose={() => setStatementAcc(null)} />
      <SecretDialog open={secretOpen} onOpenChange={setSecretOpen} onSaved={() => qc.invalidateQueries({ queryKey: ["finances"] })} />
    </AppShell>
  );
}

function Kpi({ icon: Icon, label, value, sub }: { icon: typeof Wallet; label: string; value: string; sub: string }) {
  return (
    <div className="rounded-2xl border bg-card p-5 shadow-soft">
      <div className="flex items-center gap-2 text-sm font-medium"><Icon className="size-4 text-primary" />{label}</div>
      <div className="mt-3 text-2xl font-extrabold text-primary">{value}</div>
      <div className="text-xs text-muted-foreground">{sub}</div>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border bg-card p-5 shadow-soft">
      <h2 className="mb-3 text-lg font-bold">{title}</h2>
      <div className="divide-y">{children}</div>
    </section>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="py-6 text-center text-sm text-muted-foreground">{text}</p>;
}

const KNOWN: { re: RegExp; label: string; color: string }[] = [
  { re: /nubank|\bnu\b/i, label: "nu", color: "#820AD1" },
  { re: /caixa/i, label: "X", color: "#005CA9" },
  { re: /c6/i, label: "C6", color: "#1a1a1a" },
  { re: /btg/i, label: "btg", color: "#0B2F6B" },
  { re: /ita[uú]/i, label: "itaú", color: "#EC7000" },
  { re: /bradesco/i, label: "B", color: "#CC092F" },
  { re: /santander/i, label: "S", color: "#EC0000" },
  { re: /inter/i, label: "inter", color: "#FF7A00" },
  { re: /brasil|\bbb\b/i, label: "BB", color: "#F8D117" },
  { re: /casas bahia/i, label: "CB", color: "#0033A0" },
  { re: /mercado pago/i, label: "MP", color: "#00B1EA" },
  { re: /picpay/i, label: "Pic", color: "#21C25E" },
];

function BankLogo({ acc, size = "size-10" }: { acc: { institution: string; logo: string | null; color: string | null }; size?: string }) {
  const [broken, setBroken] = useState(false);
  if (acc.logo && !broken) {
    return <img src={acc.logo} alt={acc.institution} onError={() => setBroken(true)} className={`${size} shrink-0 rounded-xl bg-card object-contain p-1 shadow-sm`} />;
  }
  const k = KNOWN.find((x) => x.re.test(acc.institution));
  const bg = acc.color ?? k?.color;
  return (
    <div className={`${size} grid shrink-0 place-items-center rounded-xl text-sm font-extrabold ${bg ? "text-primary-foreground" : "bg-accent text-accent-foreground"}`} style={bg ? { background: bg } : undefined}>
      {k?.label ?? acc.institution.slice(0, 2).toUpperCase()}
    </div>
  );
}

function BrandMark({ brand, dark }: { brand: string; dark?: boolean }) {
  if (/master/i.test(brand)) {
    return (
      <span className="relative inline-flex h-6 w-10">
        <span className="absolute left-0 size-6 rounded-full" style={{ background: "#EB001B" }} />
        <span className="absolute right-0 size-6 rounded-full opacity-90" style={{ background: "#F79E1B" }} />
      </span>
    );
  }
  return <span className={`text-sm font-extrabold italic ${dark ? "text-chart-1" : ""}`}>{(brand || "VISA").toUpperCase()}</span>;
}

function relDate(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  const y = new Date(); y.setDate(today.getDate() - 1);
  const time = d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  const hasTime = !(d.getUTCHours() === 0 && d.getUTCMinutes() === 0);
  if (d.toDateString() === today.toDateString()) return hasTime ? `Hoje, ${time}` : "Hoje";
  if (d.toDateString() === y.toDateString()) return hasTime ? `Ontem, ${time}` : "Ontem";
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" }).replace(/\./g, "").replace(/ de /g, " ");
}

function Row({ acc, title, sub, right, onClick, onRemove }: { acc: FinanceAccount; title: string; sub: string; right: React.ReactNode; onClick: () => void; onRemove: () => void }) {
  return (
    <div className="group flex cursor-pointer items-center gap-3 rounded-lg py-2.5 hover:bg-muted/50" onClick={onClick}>
      <BankLogo acc={acc} />
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-semibold">{title}</div>
        <div className="truncate text-xs text-muted-foreground">{sub}</div>
      </div>
      {right}
      <button onClick={(e) => { e.stopPropagation(); onRemove(); }} aria-label="Remover conexão" className="text-muted-foreground opacity-0 transition group-hover:opacity-100 hover:text-destructive">
        <Trash2 className="size-4" />
      </button>
    </div>
  );
}

function StatementDialog({ acc, onClose }: { acc: FinanceAccount | null; onClose: () => void }) {
  const fn = useServerFn(getStatement);
  const [offset, setOffset] = useState(0);
  useEffect(() => setOffset(0), [acc?.id]);
  const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() + offset);
  const month = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  const q = useQuery({ queryKey: ["statement", acc?.id, month], queryFn: () => fn({ data: { accountId: acc!.id, month } }), enabled: !!acc });
  const txs = q.data?.transactions ?? [];
  const entradas = txs.filter((t) => t.amount > 0).reduce((s, t) => s + t.amount, 0);
  const saidas = txs.filter((t) => t.amount < 0).reduce((s, t) => s + t.amount, 0);
  return (
    <Dialog open={!!acc} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        {acc && (
          <>
            <DialogHeader>
              <div className="flex items-center gap-3">
                <BankLogo acc={acc} />
                <div>
                  <DialogTitle>{acc.type === "CREDIT" ? acc.name : acc.institution}</DialogTitle>
                  <DialogDescription>Extrato mensal{acc.number ? ` • •••• ${acc.number}` : ""}</DialogDescription>
                </div>
              </div>
            </DialogHeader>
            <div className="flex items-center justify-between rounded-xl bg-muted px-3 py-2">
              <Button variant="ghost" size="icon" onClick={() => setOffset(offset - 1)} aria-label="Mês anterior"><ChevronLeft /></Button>
              <span className="font-semibold capitalize">{d.toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}</span>
              <Button variant="ghost" size="icon" disabled={offset >= 0} onClick={() => setOffset(offset + 1)} aria-label="Próximo mês"><ChevronRight /></Button>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-xl bg-success-soft p-3"><div className="text-xs text-muted-foreground">Entradas</div><div className="font-bold text-success">{brl(entradas)}</div></div>
              <div className="rounded-xl bg-danger-soft p-3"><div className="text-xs text-muted-foreground">Saídas</div><div className="font-bold text-destructive">{brl(Math.abs(saidas))}</div></div>
            </div>
            <div className="max-h-80 divide-y overflow-y-auto">
              {q.isLoading && <Empty text="Carregando extrato…" />}
              {q.error && <Empty text={(q.error as Error).message} />}
              {!q.isLoading && !q.error && txs.length === 0 && <Empty text="Nenhuma movimentação neste mês." />}
              {txs.map((t) => (
                <div key={t.id} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold">{t.description}</div>
                    <div className="text-xs text-muted-foreground">{new Date(t.date).toLocaleDateString("pt-BR")} • {t.category}</div>
                  </div>
                  <div className={`shrink-0 text-sm font-bold ${t.amount >= 0 ? "text-success" : "text-destructive"}`}>{t.amount >= 0 ? "+ " : "- "}{brl(Math.abs(t.amount))}</div>
                </div>
              ))}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function SecretDialog({ open, onOpenChange, onSaved }: { open: boolean; onOpenChange: (o: boolean) => void; onSaved: () => void }) {
  const statusFn = useServerFn(getCredentialStatus);
  const updateFn = useServerFn(updateCredentials);
  const status = useQuery({ queryKey: ["cred-status"], queryFn: () => statusFn(), enabled: open });
  const [clientId, setClientId] = useState("");
  const [secret, setSecret] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (status.data) setClientId(status.data.clientId);
  }, [status.data]);

  async function save() {
    setSaving(true);
    try {
      await updateFn({ data: { clientId, clientSecret: secret } });
      toast.success("Client Secret atualizado com sucesso.");
      setSecret("");
      status.refetch();
      onSaved();
      onOpenChange(false);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Alterar Client Secret (Pluggy)</DialogTitle>
          <DialogDescription>
            As credenciais são testadas na Pluggy antes de salvar. Secret atual: {status.data?.secretHint ?? "…"}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="cid">Client ID</Label>
            <Input id="cid" value={clientId} onChange={(e) => setClientId(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="csec">Novo Client Secret</Label>
            <Input id="csec" type="password" value={secret} onChange={(e) => setSecret(e.target.value)} placeholder="Cole o novo Client Secret" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button variant="brand" onClick={save} disabled={saving || !secret}>{saving ? "Validando…" : "Salvar"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default Route;
