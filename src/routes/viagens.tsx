import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { AppShell, useRequireUser } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AxionTripCompare } from "@/components/AxionTripCompare";
import { Label } from "@/components/ui/label";
import { PontosMilhasModule } from "@/components/viagens/PontosMilhasModule";

export const Route = createFileRoute("/viagens")({
  head: () => ({ meta: [{ title: "Viagens — Axion" }] }),
  component: Page,
});

type Item = { id: string; first: string; second: string; done: boolean; createdAt: string };
const fields = [
  { label: "Destino", placeholder: "Cidade ou destino" },
  { label: "Data", placeholder: "DD/MM/AAAA" },
] as const;

function isTripItem(value: unknown): value is Item {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<Item>;
  return typeof item.id === "string" && typeof item.first === "string" && typeof item.second === "string";
}

function Page() {
  const user = useRequireUser();
  const storageKey = `axion:viagens:${user?.email ?? "initializing"}`;
  const [items, setItems] = useState<Item[]>([]);
  const [first, setFirst] = useState("");
  const [second, setSecond] = useState("");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!user?.email) { setReady(false); return; }
    try {
      const parsed: unknown = JSON.parse(localStorage.getItem(storageKey) ?? "[]");
      setItems(Array.isArray(parsed) ? parsed.filter(isTripItem) : []);
    } catch { setItems([]); }
    setReady(true);
  }, [storageKey, user?.email]);

  function persist(next: Item[]) {
    setItems(next);
    try { localStorage.setItem(storageKey, JSON.stringify(next)); } catch { /* Keep current session state. */ }
  }

  function add(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!ready || !first.trim()) return;
    persist([{ id: crypto.randomUUID(), first: first.trim(), second: second.trim(), done: false, createdAt: new Date().toISOString() }, ...items]);
    setFirst(""); setSecond("");
  }

  function remove(id: string) {
    if (window.confirm("Excluir este registro?")) persist(items.filter((item) => item.id !== id));
  }

  return (
    <AppShell active="viagens" user={user}>
      <div className="mx-auto max-w-5xl p-6 lg:p-8">
        <h1 className="text-3xl font-bold">Viagens</h1>
        <p className="mt-1 text-sm text-muted-foreground">Planeje destinos, datas e observações de viagem.</p>
        <form onSubmit={add} className="mt-6 grid gap-4 rounded-2xl border bg-card p-5 md:grid-cols-[1fr_1fr_auto] md:items-end">
          <div className="space-y-2"><Label htmlFor="trip-destination">{fields[0].label}</Label><Input id="trip-destination" required value={first} onChange={(event) => setFirst(event.target.value)} placeholder={fields[0].placeholder} /></div>
          <div className="space-y-2"><Label htmlFor="trip-date">{fields[1].label}</Label><Input id="trip-date" value={second} onChange={(event) => setSecond(event.target.value)} placeholder={fields[1].placeholder} /></div>
          <Button type="submit" disabled={!ready}>Adicionar</Button>
        </form>
        <div className="mt-6 space-y-3">
          {!ready && <p className="text-muted-foreground">Carregando dados…</p>}
          {ready && items.length === 0 && <p className="rounded-xl border border-dashed p-8 text-center text-muted-foreground">Nenhum registro cadastrado.</p>}
          {ready && items.map((item) => <div key={item.id} className="flex flex-wrap items-center gap-3 rounded-xl border bg-card p-4"><div className="min-w-0 flex-1"><p className={item.done ? "line-through opacity-70" : "font-medium"}>{item.first}</p><p className="text-sm text-muted-foreground">{item.second}</p></div><Button type="button" variant="ghost" size="sm" onClick={() => remove(item.id)}>Excluir</Button></div>)}
        </div>
        <AxionTripCompare />
        {user?.email ? <PontosMilhasModule userEmail={user.email} /> : <PontosMilhasModule />}
        <p className="mt-8 text-xs text-muted-foreground">Saldos, validade e comparações de pontos são geridos neste módulo. A disponibilidade de passagens com milhas não é consultada automaticamente.</p>
      </div>
    </AppShell>
  );
}
