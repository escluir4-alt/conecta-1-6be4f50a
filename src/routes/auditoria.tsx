import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AppShell, useRequireUser } from "@/components/AppShell";
import { getAuditLog } from "@/lib/finance/finance.functions";

export const Route = createFileRoute("/auditoria")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Logs de Auditoria — Axion" },
      { name: "description", content: "Registro imutável de todas as ações financeiras." },
      { property: "og:title", content: "Logs de Auditoria — Axion" },
      { property: "og:description", content: "Registro imutável de todas as ações financeiras." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuditoriaPage,
});

const ACTION_LABELS: Record<string, string> = {
  import_seed: "Importação inicial dos dados",
  ensure_month: "Sincronização do mês",
  pay_bill: "Pagamento de conta",
  pay_installment: "Pagamento de parcela",
  revise_bill: "Correção de pagamento",
  revise_installment: "Correção de parcela",
  add_bill: "Conta avulsa criada",
  delete_bill: "Conta excluída",
  import_csv: "Importação de CSV",
  update_annual_cell: "Edição de célula anual",
  add_creditor: "Credor adicionado",
  update_creditor: "Credor editado",
  delete_creditor: "Credor excluído",
  archive_year: "Exercício arquivado",
  reopen_year: "Exercício reaberto",
  archive_contract: "Contrato arquivado",
  reopen_contract: "Contrato reaberto",
  create_contract: "Contrato criado",
  add_comment: "Comentário adicionado",
  upload_attachment: "Comprovante anexado",
};

function AuditoriaPage() {
  const user = useRequireUser();
  const auditFn = useServerFn(getAuditLog);
  const q = useQuery({ queryKey: ["audit-log"], queryFn: () => auditFn(), enabled: !!user });
  const entries = q.data?.entries ?? [];

  return (
    <AppShell active="auditoria" user={user}>
      <div className="p-6 lg:p-8">
        <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Sistema</div>
        <h1 className="text-3xl font-extrabold">Logs de Auditoria</h1>
        <p className="text-sm text-muted-foreground">
          Registro imutável de ações do módulo financeiro. Não pode ser editado ou apagado.
        </p>

        <div className="mt-6 overflow-x-auto rounded-2xl border bg-card shadow-soft">
          <table className="w-full min-w-[900px] text-sm">
            <thead>
              <tr className="bg-muted text-xs uppercase tracking-wide text-muted-foreground">
                <th className="rounded-l-lg px-3 py-2.5 text-left">Data/Hora</th>
                <th className="px-3 py-2.5 text-left">Ação</th>
                <th className="px-3 py-2.5 text-left">Entidade</th>
                <th className="px-3 py-2.5 text-left">Registro</th>
                <th className="rounded-r-lg px-3 py-2.5 text-left">Antes → Depois</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {q.isLoading && <tr><td colSpan={5} className="px-3 py-8 text-center text-muted-foreground">Carregando logs…</td></tr>}
              {!q.isLoading && entries.length === 0 && (
                <tr><td colSpan={5} className="px-3 py-8 text-center text-muted-foreground">Nenhum log registrado ainda.</td></tr>
              )}
              {entries.map((e: any) => (
                <tr key={e.seq}>
                  <td className="whitespace-nowrap px-3 py-2 text-xs text-muted-foreground">
                    {new Date(e.at).toLocaleString("pt-BR")}
                  </td>
                  <td className="px-3 py-2 font-medium">{ACTION_LABELS[e.action] ?? e.action}</td>
                  <td className="px-3 py-2 text-xs">{e.entity_type ?? "—"}</td>
                  <td className="max-w-40 truncate px-3 py-2 text-xs text-muted-foreground">{e.entity_id ?? "—"}</td>
                  <td className="max-w-72 px-3 py-2 font-mono text-xs text-muted-foreground">
                    <span className="line-clamp-2 break-all">
                      {e.before_json ? JSON.stringify(e.before_json) : "—"} → {e.after_json ? JSON.stringify(e.after_json) : "—"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AppShell>
  );
}
