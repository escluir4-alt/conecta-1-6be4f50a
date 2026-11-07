import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell, useRequireUser } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/viagens")({ head: () => ({ meta: [{ title: "Viagens — Axion" }] }), component: Page });

type Item = { id: string; first: string; second: string; done: boolean; createdAt: string };
const fields = [{ label:"Destino", placeholder:"Cidade ou destino" }, { label:"Data", placeholder:"DD/MM/AAAA" }] as const;
function Page() {
  const user = useRequireUser();
  const storageKey = "axion:viagens:" + (user?.email ?? "initializing");
  const [items, setItems] = useState<Item[]>([]);
  const [first, setFirst] = useState("");
  const [second, setSecond] = useState("");
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (!user?.email) { setReady(false); return; }
    try {
      const parsed: unknown = JSON.parse(localStorage.getItem(storageKey) ?? "[]");
      setItems(Array.isArray(parsed) ? parsed.filter((x): x is Item => !!x && typeof x === "object" && typeof x.id === "string" && typeof x.first === "string" && typeof x.second === "string") : []);
    } catch { setItems([]); }
    setReady(true);
  }, [storageKey, user?.email]);
  function persist(next: Item[]) {
    setItems(next);
    localStorage.setItem(storageKey, JSON.stringify(next));
  }
  function add(event: React.FormEvent) {
    event.preventDefault();
    if (!ready || !first.trim()) return;
    persist([{ id: crypto.randomUUID(), first: first.trim(), second: second.trim(), done: false, createdAt: new Date().toISOString() }, ...items]);
    setFirst(""); setSecond("");
  }
  function remove(id: string) {
    if (window.confirm("Excluir este registro?")) persist(items.filter(item => item.id !== id));
  }
  return <AppShell active="viagens" user={user}>
    <div className="mx-auto max-w-5xl p-6 lg:p-8">
      <h1 className="text-3xl font-bold">Viagens</h1>
      <p className="mt-1 text-sm text-muted-foreground">Planeje destinos, datas e observações de viagem.</p>
      <form onSubmit={add} className="mt-6 grid gap-4 rounded-2xl border bg-card p-5 md:grid-cols-[1fr_1fr_auto] md:items-end">
        <div className="space-y-2"><Label htmlFor="first">{fields[0].label}</Label><Input id="first" required value={first} onChange={e => setFirst(e.target.value)} placeholder={fields[0].placeholder} /></div>
        <div className="space-y-2"><Label htmlFor="second">{fields[1].label}</Label><Input id="second" value={second} onChange={e => setSecond(e.target.value)} placeholder={fields[1].placeholder} /></div>
        <Button type="submit" disabled={!ready}>Adicionar</Button>
      </form>
      <div className="mt-6 space-y-3">
        {!ready && <p className="text-muted-foreground">Carregando dados…</p>}
        {ready && items.length === 0 && <p className="rounded-xl border border-dashed p-8 text-center text-muted-foreground">Nenhum registro cadastrado.</p>}
        {ready && items.map(item => <div key={item.id} className="flex flex-wrap items-center gap-3 rounded-xl border bg-card p-4">
          
          <div className="min-w-0 flex-1"><p className={item.done ? "font-medium line-through opacity-60" : "font-medium"}>{item.first}</p><p className="whitespace-pre-wrap break-words text-sm text-muted-foreground">{item.second}</p></div>
          <Button variant="outline" size="sm" onClick={() => { setFirst(item.first); setSecond(item.second); persist(items.filter(x => x.id !== item.id)); }}>Editar</Button>
          <Button variant="ghost" size="sm" onClick={() => remove(item.id)}>Excluir</Button>
        </div>)}
      </div>
      <p className="mt-8 text-xs text-muted-foreground">Versão inicial: registros armazenados apenas neste navegador e separados por usuário. Não há sincronização com o banco ou transferência automática de dados antigos.</p>
    </div>
  </AppShell>;
}
