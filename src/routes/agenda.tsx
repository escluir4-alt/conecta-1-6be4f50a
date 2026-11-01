import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { AppShell, useRequireUser } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { getHistory, getMonthExpenses } from "@/lib/finance/finance.functions";
import { getRevenue } from "@/lib/finance/revenue.functions";
import { formatDateBR } from "@/lib/finance/money";
import { todayBR } from "@/lib/finance/revenue";
import { brasiliaHolidays, financialAgendaItems, orderAgendaDays, type AgendaItem } from "@/lib/finance/agenda";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export const Route = createFileRoute("/agenda")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Agenda Financeira — Casa Clara" },
      { name: "description", content: "Calendário de Brasília com feriados, vencimentos, pagamentos e recebimentos por dia." },
      { property: "og:title", content: "Agenda Financeira — Casa Clara" },
      { property: "og:description", content: "Feriados de Brasília e atividades do mês, organizadas por dia." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AgendaPage,
});

const WEEK = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const KIND = { feriado: "Feriado", vencimento: "Vencimento", pagamento: "Pagamento", recebimento: "Recebimento" };

function Activities({ items }: { items: AgendaItem[] }) {
  return <div className="divide-y">{items.map(it => (
    <div key={it.id} className="flex items-start gap-3 py-3 text-sm">
      <span className={`mt-1 size-2 shrink-0 rounded-full ${it.kind === "feriado" ? "bg-destructive" : it.done ? "bg-success" : "bg-primary"}`} />
      <div className="min-w-0 flex-1">
        <div className={`break-words font-semibold ${it.kind === "feriado" ? "text-destructive" : ""}`}>{it.title}</div>
        <div className="text-xs text-muted-foreground">{KIND[it.kind]}{it.kind === "vencimento" && it.done ? " · Concluído" : ""}</div>
        {it.detail && <p className="mt-1 whitespace-pre-wrap break-words text-muted-foreground">{it.detail}</p>}
      </div>
    </div>
  ))}</div>;
}

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
  const [dayOpen, setDayOpen] = useState(false);
  const fetchExp = useServerFn(getMonthExpenses);
  const fetchRev = useServerFn(getRevenue);
  const fetchHistory = useServerFn(getHistory);
  const exp = useQuery({ queryKey: ["agenda-exp", user?.email, month], queryFn: () => fetchExp({ data: { period: month } }), enabled: !!user });
  const rev = useQuery({ queryKey: ["revenue", user?.email, month], queryFn: () => fetchRev({ data: { month } }), enabled: !!user });
  const history = useQuery({ queryKey: ["agenda-payments", user?.email], queryFn: () => fetchHistory({ data: { year: null, creditor: null } }), enabled: !!user });

  const items = useMemo<AgendaItem[]>(() => [
    ...brasiliaHolidays(Number(month.slice(0, 4))).filter(h => h.date.startsWith(month)),
    ...financialAgendaItems(month, rev.data?.entries ?? [], exp.data?.bills ?? [], history.data?.items ?? []),
  ], [rev.data, exp.data, history.data, month]);

  const [y = 0, m = 1] = month.split("-").map(Number);
  const first = new Date(Date.UTC(y, m - 1, 1)).getUTCDay();
  const days = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const cells: (string | null)[] = [...Array(first).fill(null), ...Array.from({ length: days }, (_, i) => `${month}-${String(i + 1).padStart(2, "0")}`)];
  const byDay = (d: string) => items.filter((i) => i.date === d);
  const activityDays = orderAgendaDays(items.map(i => i.date), today);
  const selectedItems = selected ? byDay(selected) : [];
  const selectedHolidays = selectedItems.filter(i => i.kind === "feriado");
  const loading = exp.isLoading || rev.isLoading || history.isLoading;
  const failed = exp.isError || rev.isError || history.isError;
  const openDay = (date: string) => { setSelected(date); setDayOpen(true); };
  const label = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(Date.UTC(y, m - 1, 1)));

  return (
    <AppShell active="agenda" user={user}>
      <div className="p-4 md:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div><h1 className="text-2xl font-bold">Agenda</h1><p className="mt-1 text-sm text-muted-foreground">Brasília, DF</p></div>
          {selected && <div className="max-w-full text-right text-sm"><div className="font-semibold">{formatDateBR(selected).slice(0, 5)}</div>{selectedHolidays.map(h => <div key={h.id} className="break-words font-semibold text-destructive">Feriado · {h.title}</div>)}</div>}
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" aria-label="Mês anterior" onClick={() => { setMonth(shift(month, -1)); setSelected(null); }}><ChevronLeft /></Button>
            <span className="min-w-40 text-center font-semibold capitalize">{label}</span>
            <Button variant="outline" size="icon" aria-label="Próximo mês" onClick={() => { setMonth(shift(month, 1)); setSelected(null); }}><ChevronRight /></Button>
          </div>
        </div>
        {loading && <p className="mt-4 text-sm text-muted-foreground" role="status">Carregando atividades…</p>}
        {failed && <p role="alert" className="mt-4 text-sm text-destructive">Não foi possível carregar todos os registros. <Button variant="link" onClick={() => { void exp.refetch(); void rev.refetch(); void history.refetch(); }}>Tentar novamente</Button></p>}
        <div className="mt-5 grid grid-cols-7 gap-1 text-xs">
          {WEEK.map((w) => <div key={w} className="py-1 text-center font-semibold text-muted-foreground">{w}</div>)}
          {cells.map((d, i) => {
            if (!d) return <div key={`e${i}`} />;
            const its = byDay(d);
            const holiday = its.some(it => it.kind === "feriado");
            return (
              <Button key={d} variant="ghost" type="button" onClick={() => openDay(d)}
                aria-label={`${formatDateBR(d)}${holiday ? ` · Feriado · ${its.filter(it => it.kind === "feriado").map(it => it.title).join(" · ")}` : ""}`}
                aria-pressed={selected === d} aria-current={d === today ? "date" : undefined}
                className={`flex h-28 min-w-0 flex-col items-stretch justify-start gap-1 overflow-hidden rounded-md border p-1.5 text-left text-xs font-normal whitespace-normal sm:h-32 sm:p-2 ${holiday ? "border-destructive/40 bg-danger-soft text-destructive hover:bg-danger-soft" : selected === d ? "border-primary bg-accent" : "bg-card hover:bg-accent"} ${d === today ? "ring-2 ring-primary ring-inset" : ""}`}>
                <div className="flex justify-between font-semibold"><span>{Number(d.slice(8))}</span>{d === today && <span className="hidden text-primary sm:inline">Hoje</span>}</div>
                {its.slice(0, 3).map((it) => (
                  <div key={it.id} className={`truncate ${it.kind === "feriado" ? "font-semibold text-destructive" : it.done ? "text-success" : "text-foreground"}`}>{it.title}</div>
                ))}
                {its.length > 3 && <div className="text-muted-foreground">+{its.length - 3}</div>}
              </Button>
            );
          })}
        </div>
        <section className="mt-6">
          <h2 className="text-lg font-bold">Atividades do mês</h2>
          <div className="mt-3 divide-y border-t">
            {!loading && !failed && activityDays.length === 0 && <p className="py-4 text-sm text-muted-foreground">Nenhuma atividade neste mês.</p>}
            {activityDays.map(d => <section key={d} className="py-3" aria-label={`Atividades de ${formatDateBR(d)}`}>
              <div className="flex items-center justify-between gap-2"><Button variant="ghost" onClick={() => openDay(d)} className="h-auto justify-start gap-2 px-0 py-1 font-semibold"><CalendarDays className="size-4" />{formatDateBR(d)}</Button><span className="text-xs text-muted-foreground">{d === today ? "Hoje" : d > today ? "Futuro" : "Passado"}</span></div>
              <Activities items={byDay(d)} />
            </section>)}
          </div>
        </section>
        <Dialog open={dayOpen} onOpenChange={setDayOpen}>
          <DialogContent className="max-h-[85dvh] w-[calc(100%-2rem)] overflow-y-auto">
            <DialogHeader className="pr-5 text-right sm:text-right">
              <DialogTitle>{selected ? formatDateBR(selected).slice(0, 5) : ""}{selectedHolidays.map(h => <span key={h.id} className="mt-2 block break-words text-base leading-relaxed text-destructive">Feriado · {h.title}</span>)}</DialogTitle>
              <DialogDescription>Atividades do dia · Brasília, DF</DialogDescription>
            </DialogHeader>
            {loading && <p className="text-sm text-muted-foreground">Carregando atividades…</p>}
            {failed && <p role="alert" className="text-sm text-destructive">Alguns registros não puderam ser carregados.</p>}
            <Activities items={selectedItems} />
            {!loading && !failed && selectedItems.length === 0 && <p className="py-4 text-sm text-muted-foreground">Nenhuma atividade registrada neste dia.</p>}
          </DialogContent>
        </Dialog>
      </div>
    </AppShell>
  );
}
