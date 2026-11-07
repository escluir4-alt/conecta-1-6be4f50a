import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { evaluate } from "@/lib/expr";
import { AppShell, useRequireUser } from "@/components/AppShell";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/calculadora")({
  head: () => ({ meta: [{ title: "Calculadora — Axion" }] }),
  component: CalculatorPage,
});

const keys = ["(", ")", "%", "÷", "7", "8", "9", "×", "4", "5", "6", "-", "1", "2", "3", "+", "0", ",", "⌫", "="];
function CalculatorPage() {
  const user = useRequireUser();
  const [expression, setExpression] = useState("");
  const [history, setHistory] = useState<string[]>([]);
  const [error, setError] = useState("");
  useEffect(() => {
    try {
      const raw = JSON.parse(localStorage.getItem("axion-calculator-history") ?? "[]");
      if (Array.isArray(raw)) setHistory(raw.filter((x): x is string => typeof x === "string").slice(0, 50));
    } catch { setHistory([]); }
  }, []);
  function save(items: string[]) {
    setHistory(items);
    localStorage.setItem("axion-calculator-history", JSON.stringify(items));
  }
  function press(key: string) {
    setError("");
    if (key === "⌫") { setExpression(x => x.slice(0, -1)); return; }
    if (key !== "=") { setExpression(x => x + key); return; }
    try {
      const result = String(evaluate(expression)).replace(".", ",");
      save([`${expression} = ${result}`, ...history].slice(0, 50));
      setExpression(result);
    } catch (e) { setError(e instanceof Error ? e.message : "Não foi possível calcular"); }
  }
  return <AppShell active="calculadora" user={user}>
    <div className="mx-auto max-w-5xl p-6 lg:p-8">
      <h1 className="mb-6 text-3xl font-bold">Calculadora</h1>
      <div className="grid gap-6 md:grid-cols-[minmax(280px,360px)_1fr]">
        <section className="rounded-2xl border bg-card p-5">
          <output aria-live="polite" className="mb-2 block min-h-16 break-all rounded-xl bg-muted p-4 text-right text-2xl">{expression || "0"}</output>
          <p role="alert" className="mb-3 min-h-5 text-right text-sm text-destructive">{error}</p>
          <div className="grid grid-cols-4 gap-2">
            <Button variant="outline" className="col-span-4" onClick={() => { setExpression(""); setError(""); }}>Limpar</Button>
            {keys.map(k => <Button key={k} className="h-12 text-lg" variant={k === "=" ? "default" : "outline"} onClick={() => press(k)}>{k}</Button>)}
          </div>
        </section>
        <section className="rounded-2xl border bg-card p-5">
          <div className="mb-4 flex items-center justify-between gap-2">
            <h2 className="font-semibold">Histórico de cálculos</h2>
            <Button size="sm" variant="ghost" onClick={() => save([])}>Limpar histórico</Button>
          </div>
          {history.length === 0 && <p className="text-sm text-muted-foreground">Nenhum cálculo registrado.</p>}
          {history.map((entry, i) => <button key={i} onClick={() => setExpression(entry.split(" = ")[1] ?? "")} className="block w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-muted">{entry}</button>)}
          <p className="mt-4 text-xs text-muted-foreground">Histórico armazenado neste navegador, sem alterar dados financeiros.</p>
        </section>
      </div>
    </div>
  </AppShell>;
}
