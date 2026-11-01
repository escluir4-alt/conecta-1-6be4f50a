import { Check, Paperclip, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { diffLabel, displayNote, formatBRL, formatDateBR } from '@/lib/finance/money';
import type { RevenueEntry } from '@/lib/finance/revenue';

export function RevenueTable({ entries, installments = false, onReceive, onFiles, onAdjust }: {
  entries: RevenueEntry[];
  installments?: boolean;
  onReceive: (entry: RevenueEntry) => void;
  onFiles: (entry: RevenueEntry) => void;
  onAdjust?: (entry: RevenueEntry) => void;
}) {
  return <div className="overflow-x-auto border bg-card"><table className="w-full min-w-[1050px] text-sm">
    <thead><tr className="bg-muted text-xs uppercase text-muted-foreground">
      <th className="px-3 py-2.5 text-left">{installments ? 'Parcela' : 'Fonte de renda'}</th>
      <th className="px-3 py-2.5 text-right">Valor previsto</th><th className="px-3 py-2.5">Vencimento</th><th className="px-3 py-2.5">Recebimento</th>
      <th className="px-3 py-2.5 text-right">Valor recebido</th><th className="px-3 py-2.5">Diferença</th><th className="px-3 py-2.5 text-left">Observação</th>
      <th className="px-3 py-2.5">Comprovante</th><th className="no-print px-3 py-2.5">Ajuste</th>
    </tr></thead><tbody className="divide-y">{entries.map(entry => <tr key={entry.id} className={entry.received_date && installments ? 'bg-success-soft/70' : undefined}>
      <td className="px-3 py-2 font-semibold">{installments ? String(entry.number).padStart(3, '0') : entry.title}{!installments && entry.contract_id && <div className="text-xs font-normal text-muted-foreground">Parcela {entry.number}</div>}</td>
      <td className="px-3 py-2 text-right">{formatBRL(entry.expected_cents)}</td><td className="px-3 py-2 text-center">{formatDateBR(entry.due_date)}</td>
      <td className="px-3 py-2 text-center">{formatDateBR(entry.received_date)}</td><td className="px-3 py-2 text-right font-semibold">{formatBRL(entry.received_cents)}</td>
      <td className="px-3 py-2 text-center text-xs">{diffLabel(entry.expected_cents, entry.received_cents)}</td>
      <td className="max-w-52 px-3 py-2 text-xs">{displayNote({ due_date: entry.due_date, paid_date: entry.received_date, expected_cents: entry.expected_cents, paid_cents: entry.received_cents, note: entry.note })}</td>
      <td className="px-3 py-2 text-center"><Button variant="ghost" size="icon" aria-label={`Comprovantes de ${entry.title}`} title="Comprovantes" onClick={() => onFiles(entry)}><Paperclip /></Button></td>
      <td className="no-print px-3 py-2"><div className="flex justify-center gap-1"><Button variant="outline" size="icon" title={entry.received_date ? 'Corrigir recebimento' : 'Registrar recebimento'} aria-label={`${entry.received_date ? 'Corrigir' : 'Registrar recebimento de'} ${entry.title}`} onClick={() => onReceive(entry)}>{entry.received_date ? <Pencil /> : <Check />}</Button>{onAdjust && !entry.received_date && <Button size="sm" variant="ghost" onClick={() => onAdjust(entry)}>Atualizar valor</Button>}</div></td>
    </tr>)}</tbody></table></div>;
}