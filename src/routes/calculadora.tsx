import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import { evaluate } from "@/lib/expr";
import { AppShell, useRequireUser } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";

export const Route = createFileRoute("/calculadora")({
  head: () => ({ meta: [{ title: "Calculadora — Axion" }] }),
  component: CalculatorPage,
});

const keys = ["(", ")", "%", "÷", "7", "8", "9", "×", "4", "5", "6", "-", "1", "2", "3", "+", "0", ",", "⌫", "="];

function normalizeExpression(value: string) {
  return value.replace(/[xX*]/g, "×").replace(/\//g, "÷").replace(/\./g, ",").replace(/[^0-9+\-×÷(),%]/g, "");
}

function CalculatorPage() {
  const user = useRequireUser();
  const inputRef = useRef<HTMLInputElement>(null);
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

  function clear() {
    setExpression("");
    setError("");
    inputRef.current?.focus();
  }

  function calculate() {
    setError("");
    try {
      const result = String(evaluate(expression)).replace(".", ",");
      save([`${expression} = ${result}`, ...history].slice(0, 50));
      setExpression(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível calcular");
    }
    inputRef.current?.focus();
  }

  function insertAtCursor(value: string, erase = false) {
    const input = inputRef.current;
    const start = input?.selectionStart ?? expression.length;
    const end = input?.selectionEnd ?? expression.length;
    const from = erase && start === end ? Math.max(0, start - 1) : start;
    const next = expression.slice(0, from) + (erase ? "" : value) + expression.slice(end);
    setExpression(next);
    setError("");
    input?.focus();
    // React renders the controlled value after the event; restore the cursor afterwards.
    queueMicrotask(() => input?.setSelectionRange(from + (erase ? 0 : value.length), from + (erase ? 0 : value.length)));
  }

  function press(key: string) {
    if (key === "=") { calculate(); return; }
    if (key === "⌫") { insertAtCursor("", true); return; }
    insertAtCursor(key);
  }

  function onInputChange(value: string, caret: number | null) {
    const beforeCaret = normalizeExpression(value.slice(0, caret ?? value.length)).length;
    setExpression(normalizeExpression(value));
    setError("");
    queueMicrotask(() => inputRef.current?.setSelectionRange(beforeCaret, beforeCaret));
  }

  function onInputKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter" || event.code === "NumpadEnter" || event.key === "=") {
      event.preventDefault();
      calculate();
    } else if (event.key === "Escape") {
      event.preventDefault();
      clear();
    }
  }

  return <AppShell active="calculadora" user={user}>
    <div className="mx-auto max-w-5xl p-6 lg:p-8">
      <h1 className="mb-6 text-3xl font-bold">Calculadora</h1>
      <div className="grid gap-6 md:grid-cols-[minmax(280px,360px)_1fr]">
        <section className="rounded-2xl border bg-card p-5">
          <input
            ref={inputRef}
            aria-label="Expressão da calculadora"
            aria-describedby="calculator-keyboard-help"
            type="text"
            autoComplete="off"
            spellCheck={false}
            value={expression}
            placeholder="0"
            onChange={event => onInputChange(event.target.value, event.target.selectionStart)}
            onKeyDown={onInputKeyDown}
            className="mb-2 block min-h-16 w-full rounded-xl bg-muted p-4 text-right text-2xl text-foreground outline-none transition-shadow placeholder:text-foreground focus-visible:ring-2 focus-visible:ring-primary/50"
          />
          <p id="calculator-keyboard-help" className="sr-only">Digite os números e as operações pelo teclado principal ou numérico. Enter calcula e Escape limpa.</p>
          <p role="alert" className="mb-3 min-h-5 text-right text-sm text-destructive">{error}</p>
          <div className="grid grid-cols-4 gap-2">
            <Button variant="outline" className="col-span-4" onClick={clear}>Limpar</Button>
            {keys.map(k => <Button key={k} className="h-12 text-lg" variant={k === "=" ? "default" : "outline"} onClick={() => press(k)}>{k}</Button>)}
          </div>
        </section>
        <section className="rounded-2xl border bg-card p-5">
          <div className="mb-4 flex items-center justify-between gap-2">
            <h2 className="font-semibold">Histórico de cálculos</h2>
            <Button size="sm" variant="ghost" onClick={() => save([])}>Limpar histórico</Button>
          </div>
          {history.length === 0 && <p className="text-sm text-muted-foreground">Nenhum cálculo registrado.</p>}
          {history.map((entry, i) => (
            <div key={i} className="group flex items-center gap-1 rounded-lg transition-colors hover:bg-muted focus-within:bg-muted">
              <button
                type="button"
                onClick={() => { setExpression(entry.split(" = ")[1] ?? ""); setError(""); inputRef.current?.focus(); }}
                className="min-w-0 flex-1 break-all rounded-lg px-3 py-2 text-left text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
                title="Reutilizar resultado"
              >
                {entry}
              </button>
              <button
                type="button"
                aria-label={`Excluir cálculo: ${entry}`}
                title="Excluir este cálculo"
                onClick={() => save(history.filter((_, index) => index !== i))}
                className="mr-2 shrink-0 rounded-md p-2 text-muted-foreground transition-all hover:bg-destructive/10 hover:text-destructive focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive/50 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100 [@media(hover:hover)]:group-focus-within:opacity-100"
              >
                <Trash2 className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          ))}
          <p className="mt-4 text-xs text-muted-foreground">Histórico armazenado neste navegador, sem alterar dados financeiros.</p>
        </section>
      </div>
    </div>
  </AppShell>;
}
