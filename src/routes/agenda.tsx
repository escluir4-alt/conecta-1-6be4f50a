import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { AppShell, useRequireUser } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { getMonthExpenses } from "@/lib/finance/finance.functions";
import { getRevenue } from "@/lib/finance/revenue.functions";
import { formatBRL, formatDateBR } from "@/lib/finance/money";
import { todayBR } from "@/lib/finance/revenue";

export const Route = createFileRoute("/agenda")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Agenda Financeira — Casa Clara" },
      { name: "description", content: "Calendário mensal com receitas e despesas por data de vencimento." },
      { property: "og:title", content: "Agenda Financeira — Casa Clara" },
      { property: "og:description", content: "Veja entradas e saídas do mês em um calendário." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AgendaPage,
});

type Item = { id: string; date: string; title: string; cents: number; kind: "receita" | "despesa"; done: boolean };
const WEEK = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

function shift(month: string, d: number) {
  const [y = 0, m = 1] = month.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1 + d, 1));
  return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, "0")}`;
}

function AgendaPage() {
  const user = useRequireUser();
  const today = todayBR();
  const [month, setMonth] = useState(today.slice(0, 7));
  const [selected, setSelected] = useState<string | null>(null);
  const fetchExp = useServerFn(getMonthExpenses);
  const fetchRev = useServerFn(getRevenue);
  const exp = useQuery({ queryKey: ["agenda-exp", user?.email, month], queryFn: () => fetchExp({ data: { period: month } }), enabled: !!user });
  const rev = useQuery({ queryKey: ["revenue", user?.email, month], queryFn: () => fetchRev({ data: { month } }), enabled: !!user });

  const items = useMemo<Item[]>(() => {
    const r = (rev.data?.entries ?? []).filter((e) => e.due_date.startsWith(month)).map((e) => ({
      id: `r${e.id}`, date: e.due_date, title: e.title, cents: e.received_cents ?? e.expected_cents, kind: "receita" as const, done: !!e.received_date,
    }));
    const d = ((exp.data?.bills ?? []) as any[]).map((b) => ({
      id: `d${b.id}`, date: b.due_date as string, title: b.creditor as string, cents: (b.paid_cents ?? b.expected_cents) as number, kind: "despesa" as const, done: !!b.paid_date,
    }));
    return [...r, ...d].sort((a, b) => a.date.localeCompare(b.date));
  }, [rev.data, exp.data, month]);

  const [y = 0, m = 1] = month.split("-").map(Number);
  const first = new Date(Date.UTC(y, m - 1, 1)).getUTCDay();
  const days = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const cells: (string | null)[] = [...Array(first).fill(null), ...Array.from({ length: days }, (_, i) => `${month}-${String(i + 1).padStart(2, "0")}`)];
  const byDay = (d: string) => items.filter((i) => i.date === d);
  const totIn = items.filter((i) => i.kind === "receita").reduce((s, i) => s + i.cents, 0);
  const totOut = items.filter((i) => i.kind === "despesa").reduce((s, i) => s + i.cents, 0);
  const list = selected ? byDay(selected) : items;
  const label = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(Date.UTC(y, m - 1, 1)));

  return (
    <AppShell active="agenda" user={user}>
      <div className="p-4 md:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-bold">Agenda</h1>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" aria-label="Mês anterior" onClick={() => { setMonth(shift(month, -1)); setSelected(null); }}><ChevronLeft /></Button>
            <span className="min-w-40 text-center font-semibold capitalize">{label}</span>
            <Button variant="outline" size="icon" aria-label="Próximo mês" onClick={() => { setMonth(shift(month, 1)); setSelected(null); }}><ChevronRight /></Button>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-3 text-sm">
          <div className="rounded-lg border bg-card p-3"><div className="text-muted-foreground">Receitas</div><div className="text-lg font-bold text-primary">{formatBRL(totIn)}</div></div>
          <div className="rounded-lg border bg-card p-3"><div className="text-muted-foreground">Despesas</div><div className="text-lg font-bold text-destructive">{formatBRL(totOut)}</div></div>
          <div className="rounded-lg border bg-card p-3"><div className="text-muted-foreground">Saldo</div><div className="text-lg font-bold">{formatBRL(totIn - totOut)}</div></div>
        </div>
        {(exp.isLoading || rev.isLoading) && <p className="mt-4 text-sm text-muted-foreground">Carregando…</p>}
        <div className="mt-4 grid grid-cols-7 gap-1 text-xs">
          {WEEK.map((w) => <div key={w} className="py-1 text-center font-semibold text-muted-foreground">{w}</div>)}
          {cells.map((d, i) => {
            if (!d) return <div key={`e${i}`} />;
            const its = byDay(d);
            return (
              <button key={d} type="button" onClick={() => setSelected(selected === d ? null : d)}
                className={`min-h-20 rounded-md border p-1 text-left align-top transition ${selected === d ? "border-primary bg-accent" : "bg-card hover:bg-accent"} ${d === today ? "ring-2 ring-primary" : ""}`}>
                <div className="font-semibold">{Number(d.slice(8))}</div>
                {its.slice(0, 3).map((it) => (
                  <div key={it.id} className={`truncate ${it.kind === "receita" ? "text-primary" : "text-destructive"} ${it.done ? "line-through opacity-60" : ""}`}>{it.title}</div>
                ))}
                {its.length > 3 && <div className="text-muted-foreground">+{its.length - 3}</div>}
              </button>
            );
          })}
        </div>
        <section className="mt-6">
          <h2 className="text-lg font-bold">{selected ? `Compromissos de ${formatDateBR(selected)}` : "Todos os compromissos do mês"}</h2>
          <div className="mt-2 divide-y rounded-lg border bg-card">
            {list.length === 0 ? <p className="p-3 text-sm text-muted-foreground">Nenhum lançamento.</p> : list.map((it) => (
              <div key={it.id} className="flex flex-wrap justify-between gap-2 p-3 text-sm">
                <span><span className="text-muted-foreground">{formatDateBR(it.date)}</span> · <span className="font-semibold">{it.title}</span></span>
                <span className={it.kind === "receita" ? "text-primary" : "text-destructive"}>
                  {it.kind === "receita" ? "+" : "−"}{formatBRL(it.cents)}{it.done ? (it.kind === "receita" ? " · Recebido" : " · Pago") : ""}
                </span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </AppShell>
  );
}
