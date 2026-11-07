import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { CalendarDays, ChevronLeft, ChevronRight, Plus, Pencil, Check, Star } from "lucide-react";
import { AppShell, useRequireUser } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { getMonthExpenses } from "@/lib/finance/finance.functions";
import { getRevenue } from "@/lib/finance/revenue.functions";
import { formatDateBR, formatBRL } from "@/lib/finance/money";
import { todayBR } from "@/lib/finance/revenue";
import { brasiliaHolidays, financialAgendaItems, orderAgendaDays, type AgendaItem } from "@/lib/finance/agenda";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { AgendaForm } from "@/components/finance/AgendaForm";
import { getPersonalAgenda, checkAgendaItem } from "@/lib/finance/agenda.functions";
import { AGENDA_KINDS, personalOccurrences, type PersonalOccurrence, type PersonalRecord } from "@/lib/finance/agenda-personal";

export const Route = createFileRoute("/agenda")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Agenda Financeira — Axion" },
      { name: "description", content: "Calendário de Brasília com feriados, vencimentos, pagamentos e recebimentos por dia." },
      { property: "og:title", content: "Agenda Financeira — Axion" },
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

function PersonalActivities({items, checks, onCheck, onEdit}: {items:PersonalOccurrence[]; checks:{record_id:string;occurrence_date:string;item_key:string;done:boolean}[]; onCheck:(record:string,date:string,key:string,done:boolean)=>Promise<void>; onEdit:(record:PersonalRecord)=>void}) {
  const [pending,setPending] = useState<string | null>(null), [error,setError] = useState('');
  return <div className="divide-y">{items.map(it => <div key={it.id} className="py-3 text-sm"><div className="flex items-start justify-between gap-2"><div className="min-w-0"><div className="break-words font-semibold">{it.title}</div><div className="flex items-center gap-1 text-xs text-muted-foreground">{it.record.favorite && <Star className="size-3 fill-primary text-primary" />}{it.reminderDays ? `Lembrete · em ${it.reminderDays} ${it.reminderDays === 1 ? 'dia' : 'dias'}` : `${AGENDA_KINDS[it.record.kind]}${it.record.time ? ` · ${it.record.time}` : ''}${it.record.kind === 'work' ? ' · 12×36' : ''}`}</div></div><Button variant="ghost" size="icon" aria-label={`Editar ${it.title}`} onClick={() => onEdit(it.record)}><Pencil className="size-3.5" /></Button></div>{!it.reminderDays && <>{it.record.description && <p className="mt-1 whitespace-pre-wrap break-words text-muted-foreground">{it.record.description}</p>}{it.record.items.map(row => {const done = checks.some(c => c.record_id === it.record.id && c.occurrence_date === it.date && c.item_key === row.key && c.done);return <label key={row.key} className="mt-3 flex items-start gap-2"><Checkbox aria-label={row.description} checked={done} disabled={pending === row.key} onCheckedChange={async v => {setPending(row.key);setError('');try {await onCheck(it.record.id,it.date,row.key,v === true);} catch {setError('Não foi possível confirmar o item.');} finally {setPending(null);}}} className="mt-0.5 data-[state=checked]:bg-success data-[state=checked]:border-success" /><span className={`min-w-0 flex-1 break-words ${done ? 'line-through text-muted-foreground' : ''}`}>{row.description}{it.record.kind === 'shopping' && <span className="block text-xs text-muted-foreground">{row.quantity} · {formatBRL(row.cents)}</span>}</span>{done && <Check className="size-4 shrink-0 text-success" />}</label>;})}</>}</div>)}{error && <p role="alert" className="text-destructive">{error}</p>}</div>;
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
  const [form, setForm] = useState<{date:string;initial?:PersonalRecord} | null>(null);
  const fetchExp = useServerFn(getMonthExpenses);
  const fetchRev = useServerFn(getRevenue);
  const fetchPersonal = useServerFn(getPersonalAgenda);
  const checkItem = useServerFn(checkAgendaItem);
  const exp = useQuery({ queryKey: ["agenda-exp", user?.email, month], queryFn: () => fetchExp({ data: { period: month } }), enabled: !!user });
  const rev = useQuery({ queryKey: ["revenue", user?.email, month], queryFn: () => fetchRev({ data: { month } }), enabled: !!user });
  const personal = useQuery({ queryKey: ["agenda-personal", user?.email], queryFn: () => fetchPersonal(), enabled: !!user });

  const items = useMemo<AgendaItem[]>(() => [
    ...brasiliaHolidays(Number(month.slice(0, 4))).filter(h => h.date.startsWith(month)),
    ...financialAgendaItems(month, rev.data?.entries ?? [], exp.data?.bills ?? []),
  ], [rev.data, exp.data, month]);
  const personalItems = useMemo(() => personalOccurrences(month,personal.data?.records ?? []),[month,personal.data]);
  const onSaved = async () => {await personal.refetch();};
  const onCheck = async (record_id:string,occurrence_date:string,item_key:string,done:boolean) => {await checkItem({data:{record_id,occurrence_date,item_key,done}});await onSaved();};
  const edit = (initial:PersonalRecord) => {setDayOpen(false);setForm({date:selected ?? initial.start_date,initial});};

  const [y = 0, m = 1] = month.split("-").map(Number);
  const first = new Date(Date.UTC(y, m - 1, 1)).getUTCDay();
  const days = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const cells: (string | null)[] = [...Array(first).fill(null), ...Array.from({ length: days }, (_, i) => `${month}-${String(i + 1).padStart(2, "0")}`)];
  const byDay = (d: string) => items.filter((i) => i.date === d);
  const activityDays = orderAgendaDays([...items,...personalItems].map(i => i.date), today);
  const selectedItems = selected ? byDay(selected) : [];
  const selectedHolidays = selectedItems.filter(i => i.kind === "feriado");
  const loading = exp.isLoading || rev.isLoading || personal.isLoading;
  const failed = exp.isError || rev.isError || personal.isError;
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
            <Button variant="ghost" size="icon" aria-label="Adicionar à agenda" title="Adicionar à agenda" onClick={() => setForm({date:selected ?? (today.startsWith(month) ? today : `${month}-01`)})}><Plus /></Button>
          </div>
        </div>
        {loading && <p className="mt-4 text-sm text-muted-foreground" role="status">Carregando atividades…</p>}
        {failed && <p role="alert" className="mt-4 text-sm text-destructive">Não foi possível carregar todos os registros. <Button variant="link" onClick={() => { void exp.refetch(); void rev.refetch(); void personal.refetch(); }}>Tentar novamente</Button></p>}
        <div className="mt-5 grid grid-cols-7 gap-1 text-xs">
          {WEEK.map((w) => <div key={w} className="py-1 text-center font-semibold text-muted-foreground">{w}</div>)}
          {cells.map((d, i) => {
            if (!d) return <div key={`e${i}`} />;
            const its = byDay(d);
            const holiday = its.some(it => it.kind === "feriado");
            const cellItems = [...its.filter(it => it.kind !== 'feriado'),...personalItems.filter(it => it.date === d)];
            return (
              <Button key={d} variant="ghost" type="button" onClick={() => openDay(d)}
                aria-label={`${formatDateBR(d)}${holiday ? ` · Feriado · ${its.filter(it => it.kind === "feriado").map(it => it.title).join(" · ")}` : ""}`}
                aria-pressed={selected === d} aria-current={d === today ? "date" : undefined}
                className={`flex h-28 min-w-0 flex-col items-stretch justify-start gap-1 overflow-hidden rounded-md border p-1.5 text-left text-xs font-normal whitespace-normal sm:h-32 sm:p-2 ${holiday ? "border-destructive/40 bg-danger-soft text-destructive hover:bg-danger-soft" : selected === d ? "border-primary bg-accent" : "bg-card hover:bg-accent"} ${d === today ? "ring-2 ring-primary ring-inset" : ""}`}>
                <div className="flex justify-between font-semibold"><span>{Number(d.slice(8))}</span>{d === today && <span className="hidden text-primary sm:inline">Hoje</span>}</div>
                {cellItems.slice(0, 3).map((it) => (
                  <div key={it.id} className={`truncate ${'done' in it && it.done ? "text-success" : "text-foreground"}`}>{it.title}</div>
                ))}
                {cellItems.length > 3 && <div className="text-muted-foreground">+{cellItems.length - 3}</div>}
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
              <PersonalActivities items={personalItems.filter(it => it.date === d)} checks={personal.data?.checks ?? []} onCheck={onCheck} onEdit={edit} />
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
            <div className="flex justify-end"><Button variant="ghost" size="icon" aria-label="Adicionar atividade neste dia" title="Adicionar atividade neste dia" onClick={() => {setDayOpen(false);setForm({date:selected ?? today});}}><Plus className="size-4" /></Button></div>
            <Activities items={selectedItems.filter(it => it.kind !== 'feriado')} />
            <PersonalActivities items={personalItems.filter(it => it.date === selected)} checks={personal.data?.checks ?? []} onCheck={onCheck} onEdit={edit} />
            {!loading && !failed && selectedItems.filter(it => it.kind !== 'feriado').length === 0 && !personalItems.some(it => it.date === selected) && <p className="py-4 text-sm text-muted-foreground">Nenhuma atividade registrada neste dia.</p>}
          </DialogContent>
        </Dialog>
        {form && <AgendaForm date={form.date} initial={form.initial} onSaved={onSaved} onClose={() => setForm(null)} />}
      </div>
    </AppShell>
  );
}
