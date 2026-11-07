import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell, useRequireUser } from "@/components/AppShell";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/relogio")({
  ssr: false,
  head: () => ({ meta: [{ title: "Relógio e alarmes — Conecta" }] }),
  component: ClockPage,
});

function show(seconds: number) {
  const n = Math.max(0, Math.floor(seconds));
  return [Math.floor(n / 3600), Math.floor(n % 3600 / 60), n % 60].map(v => String(v).padStart(2, "0")).join(":");
}

function ClockPage() {
  const user = useRequireUser();
  const [now, setNow] = useState(() => new Date());
  const [elapsed, setElapsed] = useState(0);
  const [running, setRunning] = useState(false);
  const [laps, setLaps] = useState<number[]>([]);
  const [duration, setDuration] = useState(5);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [alarmTime, setAlarmTime] = useState("07:00");
  const [alarms, setAlarms] = useState<{ id: string; time: string; enabled: boolean }[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const [lastAlarmMinute, setLastAlarmMinute] = useState("");
  useEffect(() => {
    const tick = setInterval(() => {
      const date = new Date();
      setNow(date);
      if (running) setElapsed(v => v + 1);
      setRemaining(v => v === null ? null : Math.max(0, v - 1));
    }, 1000);
    return () => clearInterval(tick);
  }, [running]);
  const minute = `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}-${now.getHours()}:${now.getMinutes()}`;
  useEffect(() => {
    const current = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
    if (minute !== lastAlarmMinute && alarms.some(a => a.enabled && a.time === current)) {
      setNotice(`Alarme das ${current}`);
      setLastAlarmMinute(minute);
    }
  }, [minute, lastAlarmMinute, alarms, now]);
  useEffect(() => {
    if (remaining === 0) {
      setNotice("Temporizador concluído");
      setRemaining(null);
    }
  }, [remaining]);
  return <AppShell active="relogio" user={user}>
    <div className="p-5 lg:p-8">
      <h1 className="text-3xl font-extrabold">Relógio e alarmes</h1>
      <p className="mt-2 text-sm text-muted-foreground">Ferramentas locais de horário e produtividade.</p>
      {notice && <div role="alert" className="mt-5 flex items-center justify-between rounded-xl border border-primary p-4 font-semibold"><span>{notice}</span><Button variant="outline" onClick={() => setNotice(null)}>Dispensar</Button></div>}
      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <section className="rounded-2xl border bg-card p-5">
          <h2 className="font-semibold">Relógio</h2>
          <p className="mt-3 text-4xl font-bold tabular-nums">{now.toLocaleTimeString("pt-BR")}</p>
          <p className="mt-2 text-sm text-muted-foreground">{now.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</p>
        </section>
        <section className="rounded-2xl border bg-card p-5">
          <h2 className="font-semibold">Cronômetro</h2>
          <p className="my-3 text-4xl font-bold tabular-nums">{show(elapsed)}</p>
          <div className="flex flex-wrap gap-2"><Button onClick={() => setRunning(!running)}>{running ? "Pausar" : "Iniciar"}</Button><Button variant="outline" onClick={() => setLaps(v => [...v, elapsed])} disabled={!running}>Volta</Button><Button variant="outline" onClick={() => {setRunning(false);setElapsed(0);setLaps([]);}}>Zerar</Button></div>
          {laps.length > 0 && <ol className="mt-3 max-h-32 overflow-auto text-sm">{laps.map((v,i) => <li key={i}>Volta {i+1}: {show(v)}</li>)}</ol>}
        </section>
        <section className="rounded-2xl border bg-card p-5">
          <h2 className="font-semibold">Temporizador</h2>
          <label className="mt-3 flex items-center gap-2 text-sm">Minutos <input className="w-24 rounded-lg border bg-background p-2" type="number" min={1} max={1440} value={duration} onChange={e => setDuration(Number(e.target.value))}/></label>
          <p className="my-3 text-3xl font-bold tabular-nums">{show(remaining ?? Math.max(1,duration) * 60)}</p>
          <div className="flex gap-2"><Button onClick={() => setRemaining(Math.max(1, Math.min(1440, duration)) * 60)}>Iniciar</Button><Button variant="outline" onClick={() => setRemaining(null)}>Cancelar</Button></div>
        </section>
        <section className="rounded-2xl border bg-card p-5">
          <h2 className="font-semibold">Alarmes</h2>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <input aria-label="Horário do alarme" type="time" value={alarmTime} onChange={e => setAlarmTime(e.target.value)} className="rounded-lg border bg-background p-2" />
            <Button onClick={() => setAlarms(v => [...v, {id: crypto.randomUUID(),time:alarmTime,enabled:true}])}>Adicionar alarme</Button>
          </div>
          <div className="mt-3 space-y-2">{alarms.map(a => <div className="flex items-center justify-between rounded-lg border p-2" key={a.id}>
            <label className="flex items-center gap-2"><input type="checkbox" checked={a.enabled} onChange={e=>setAlarms(v=>v.map(x=>x.id===a.id?{...x,enabled:e.target.checked}:x))}/>{a.time}</label>
            <Button variant="outline" size="sm" onClick={() => setAlarms(v=>v.filter(x=>x.id!==a.id))}>Excluir</Button>
          </div>)}</div>
          <p className="mt-3 text-xs text-muted-foreground">Alarmes desta versão funcionam com a página aberta. Notificações em segundo plano e persistência ficam para integração posterior.</p>
        </section>
      </div>
    </div>
  </AppShell>;
}
