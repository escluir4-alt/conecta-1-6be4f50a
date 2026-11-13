import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Copy, Pencil, Printer } from "lucide-react";
import { toast } from "sonner";
import { AppShell, useRequireUser } from "@/components/AppShell";
import { PayDialog, type PayTarget } from "@/components/finance/PayDialog";
import { AttachmentButton } from "@/components/finance/AttachmentButton";
import { Button } from "@/components/ui/button";
import { displayNote, expensePaymentAdjustment, formatAdjustmentPercent, formatBRL, formatDateBR, monthOfDueDate } from "@/lib/finance/money";
import { getHistory } from "@/lib/finance/finance.functions";

export const Route = createFileRoute("/historico-pagamentos")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Histórico de Pagamentos — Axion" },
      { name: "description", content: "Todos os pagamentos confirmados, agrupados pelo mês de vencimento." },
      { property: "og:title", content: "Histórico de Pagamentos — Axion" },
      { property: "og:description", content: "Todos os pagamentos confirmados, agrupados pelo mês de vencimento." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: HistoricoPage,
});

type HistoryItem = {
  kind: "bill" | "installment";
  id: string;
  creditor: string;
  expectedCents: number;
  dueDate: string;
  paidDate: string;
  paidCents: number;
  is_settled: boolean;
  note: string | null;
  contractId: string | null;
  installmentNumber: number | null;
};

function HistoryDifference({ expected, paid, quits }: { expected: number; paid: number; quits: boolean }) {
  const adjustment = expensePaymentAdjustment(expected, paid, quits);
  if (adjustment.kind === "discount" || adjustment.kind === "surcharge") {
    return <div className={`flex flex-col font-semibold ${adjustment.kind === "discount" ? "text-blue-600 dark:text-blue-400" : "text-red-600 dark:text-red-400"}`}>
      <span>{adjustment.kind === "discount" ? "Desconto" : "Acréscimo"}</span>
      <span>{formatAdjustmentPercent(adjustment.percent)}</span>
      <span>{formatBRL(adjustment.differenceCents)}</span>
    </div>;
  }
  if (adjustment.kind === "settled") return <span className="text-success">Quitado</span>;
  return <span className="text-amber-700 dark:text-amber-300">
    {adjustment.openCents > 0 ? `Em aberto: ${formatBRL(adjustment.openCents)}` : "Aguardando quitação"}
  </span>;
}

function HistoricoPage() {
  const user = useRequireUser();
  const qc = useQueryClient();
  const [year, setYear] = useState<number | null>(null);
  const [creditor, setCreditor] = useState<string | null>(null);
  const [payTarget, setPayTarget] = useState<PayTarget | null>(null);

  const historyFn = useServerFn(getHistory);
  const q = useQuery({
    queryKey: ["history", year, creditor],
    queryFn: () => historyFn({ data: { year, creditor } }),
    enabled: !!user,
  });

  const items = (q.data?.items ?? []) as HistoryItem[];
  const groups = new Map<string, HistoryItem[]>();
  for (const it of items) {
    const key = monthOfDueDate(it.dueDate);
    groups.set(key, [...(groups.get(key) ?? []), it]);
  }

  function groupLabel(key: string) {
    const [gy = 0, gm = 1] = key.split("-").map(Number);
    const label = new Date(gy, gm - 1).toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
    return label.charAt(0).toUpperCase() + label.slice(1);
  }

  async function copyReport() {
    const lines: string[] = ["Histórico de Pagamentos — Axion", ""];
    for (const [key, list] of groups) {
      lines.push(groupLabel(key));
      lines.push(["Credor", "Valor Previsto", "Vencimento", "Pagamento", "Valor Pago", "Diferença", "Observação"].join("\t"));
      for (const it of list) {
        lines.push([
          it.creditor, formatBRL(it.expectedCents), formatDateBR(it.dueDate), formatDateBR(it.paidDate),
          formatBRL(it.paidCents), (() => {
            const adj = expensePaymentAdjustment(it.expectedCents, it.paidCents, it.is_settled);
            if (adj.kind === "discount" || adj.kind === "surcharge")
              return `${adj.kind === "discount" ? "Desconto" : "Acréscimo"} ${formatAdjustmentPercent(adj.percent)} — ${formatBRL(adj.differenceCents)}`;
            if (adj.kind === "settled") return "Quitado";
            return adj.openCents > 0 ? `Em aberto: ${formatBRL(adj.openCents)}` : "Aguardando quitação";
          })(),
          displayNote({ due_date: it.dueDate, paid_date: it.paidDate, expected_cents: it.expectedCents, paid_cents: it.paidCents, note: it.note, is_settled: it.is_settled }),
        ].join("\t"));
      }
      lines.push("");
    }
    await navigator.clipboard.writeText(lines.join("\n"));
    toast.success("Relatório copiado para a área de transferência.");
  }

  return (
    <AppShell active="historico" user={user}>
      <div className="p-6 lg:p-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Controle financeiro</div>
            <h1 className="text-3xl font-extrabold">Histórico de Pagamentos</h1>
            <p className="text-sm text-muted-foreground">Pagamentos confirmados, agrupados pelo mês de vencimento.</p>
          </div>
          <div className="no-print flex flex-wrap items-center gap-2">
            <select
              className="h-10 rounded-md border bg-card px-3 text-sm"
              value={year ?? ""}
              onChange={(e) => setYear(e.target.value ? Number(e.target.value) : null)}
            >
              <option value="">Todos os anos</option>
              {(q.data?.years ?? []).map((yy) => <option key={yy} value={yy}>{yy}</option>)}
            </select>
            <select
              className="h-10 rounded-md border bg-card px-3 text-sm"
              value={creditor ?? ""}
              onChange={(e) => setCreditor(e.target.value || null)}
            >
              <option value="">Todos os credores</option>
              {(q.data?.creditors ?? []).map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <Button variant="outline" onClick={copyReport}><Copy />Copiar</Button>
            <Button variant="outline" onClick={() => window.print()}><Printer />Imprimir / PDF</Button>
          </div>
        </div>

        {q.isLoading && <p className="mt-10 text-center text-muted-foreground">Carregando histórico…</p>}
        {!q.isLoading && items.length === 0 && (
          <p className="mt-10 text-center text-muted-foreground">Nenhum pagamento confirmado encontrado.</p>
        )}

        {[...groups.entries()].map(([key, list]) => {
          const totalPaid = list.reduce((s, it) => s + it.paidCents, 0);
          return (
            <section key={key} className="mt-6 rounded-2xl border bg-card shadow-soft">
              <div className="flex items-center justify-between px-5 pt-4">
                <h2 className="text-lg font-bold">{groupLabel(key)}</h2>
                <span className="text-sm font-semibold text-success">{list.length} pagamentos · {formatBRL(totalPaid)}</span>
              </div>
              <div className="overflow-x-auto p-5 pt-3">
                <table className="w-full min-w-[1050px] text-sm">
                  <thead>
                    <tr className="bg-muted text-xs uppercase tracking-wide text-muted-foreground">
                      <th className="rounded-l-lg px-3 py-2 text-left">Credor</th>
                      <th className="px-3 py-2 text-right">Valor Previsto</th>
                      <th className="px-3 py-2">Vencimento</th>
                      <th className="px-3 py-2">Pagamento</th>
                      <th className="px-3 py-2 text-right">Valor Pago</th>
                      <th className="px-3 py-2">Diferença</th>
                      <th className="px-3 py-2 text-left">Observação</th>
                      <th className="px-3 py-2">Comprovante</th>
                      <th className="no-print rounded-r-lg px-3 py-2">Ajuste</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {list.map((it) => (
                      <tr key={`${it.kind}-${it.id}`}>
                        <td className="px-3 py-2">
                          <div className="font-semibold">{it.creditor}</div>
                          {it.kind === "installment" && it.installmentNumber && (
                            <div className="text-xs text-muted-foreground">Parcela {it.installmentNumber}</div>
                          )}
                        </td>
                        <td className="px-3 py-2 text-right">{formatBRL(it.expectedCents)}</td>
                        <td className="px-3 py-2 text-center">{formatDateBR(it.dueDate)}</td>
                        <td className="px-3 py-2 text-center">{formatDateBR(it.paidDate)}</td>
                        <td className="px-3 py-2 text-right font-semibold">{formatBRL(it.paidCents)}</td>
                        <td className="px-3 py-2 text-center text-xs"><HistoryDifference expected={it.expectedCents} paid={it.paidCents} quits={it.is_settled} /></td>
                        <td className="max-w-52 px-3 py-2 text-xs">
                          {displayNote({ due_date: it.dueDate, paid_date: it.paidDate, expected_cents: it.expectedCents, paid_cents: it.paidCents, note: it.note, is_settled: it.is_settled })}
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex justify-center">
                            <AttachmentButton
                              entityType={it.kind === "bill" ? "bill" : "installment"}
                              entityId={it.kind === "bill" ? it.id : `${it.contractId}:${it.installmentNumber}`}
                            />
                          </div>
                        </td>
                        <td className="no-print px-3 py-2">
                          <div className="flex justify-center">
                            <button
                              aria-label="Corrigir pagamento"
                              className="grid size-8 place-items-center rounded-lg border bg-card text-muted-foreground hover:bg-accent"
                              onClick={() =>
                                setPayTarget(
                                  it.kind === "bill"
                                    ? { kind: "bill", id: it.id, creditor: it.creditor, due_date: it.dueDate, expected_cents: it.expectedCents, paid_date: it.paidDate, paid_cents: it.paidCents, note: it.note }
                                    : { kind: "installment", contractId: it.contractId!, number: it.installmentNumber!, creditor: it.creditor, due_date: it.dueDate, expected_cents: it.expectedCents, paid_date: it.paidDate, paid_cents: it.paidCents, note: it.note },
                                )
                              }
                            >
                              <Pencil className="size-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          );
        })}
      </div>

      <PayDialog
        target={payTarget}
        onClose={() => setPayTarget(null)}
        onSaved={() => qc.invalidateQueries({ queryKey: ["history"] })}
      />
    </AppShell>
  );
}
