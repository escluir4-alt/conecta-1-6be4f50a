import { useState } from 'react';
import { useServerFn } from '@tanstack/react-start';
import { toast } from 'sonner';
import { Download, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { quoteRevenueInstallments } from '@/lib/finance/contracts.functions';
import { adjustRevenue } from '@/lib/finance/revenue.functions';
import { generateInvoice, deliverInvoice, pixRecipientSchema, type ContractQuote } from '@/lib/finance/invoice';
import { formatBRL, formatDateBR } from '@/lib/finance/money';
import { todayBR, type RevenueContract } from '@/lib/finance/revenue';
import { emptyRecipient } from '@/lib/finance/pix-recipient';
import { InvoiceRecipientFields } from './InvoiceRecipientFields';

export function ContractInvoiceDialog({ contract, ids, onClose, onSaved }: {
  contract: RevenueContract;
  ids: string[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [date, setDate] = useState(todayBR());
  const [recipient, setRecipient] = useState(emptyRecipient);
  const [manual, setManual] = useState('');
  const [manualMode, setManualMode] = useState(false);
  const [error, setError] = useState('');
  const [q, setQ] = useState<ContractQuote | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Awaited<ReturnType<typeof generateInvoice>> | null>(null);

  const quote = useServerFn(quoteRevenueInstallments);
  const adjust = useServerFn(adjustRevenue);
  const official = ['IPCA', 'IGPM', 'IGP-M'].includes(contract.correction_index);
  const custom = !['Sem correção', 'IPCA', 'IGPM', 'IGP-M'].includes(contract.correction_index);
  const manualRequired = custom || manualMode;
  const manualRate = Number(manual.trim().replace(',', '.'));
  const manualValid = /^-?\d+(?:[,.]\d+)?$/.test(manual.trim()) && Number.isFinite(manualRate) && manualRate >= -99 && manualRate <= 1000;

  function changeMode(value: boolean) {
    setManualMode(value);
    setQ(null);
    setError('');
  }

  async function calculate() {
    setError('');
    setQ(null);
    if (manualRequired && !manualValid) {
      setError('Informe uma taxa manual válida entre -99% e 1000%.');
      return;
    }
    setBusy(true);
    try {
      const output = await quote({ data: {
        contractId: contract.id,
        ids,
        date,
        manualRate: manualRequired ? manualRate : null,
      } });
      setQ(output);
    } catch (e) {
      const message = (e as Error).message;
      setError(message);
      toast.error('Não foi possível calcular a atualização.');
    } finally {
      setBusy(false);
    }
  }

  async function confirm() {
    if (!q) return;
    const parsed = pixRecipientSchema.safeParse(recipient);
    if (!parsed.success) {
      toast.error('Informe chave Pix, nome e cidade do recebedor.');
      return;
    }
    setBusy(true);
    try {
      const output = await generateInvoice(q, parsed.data);
      for (const r of q.rows) {
        await adjust({ data: {
          id: r.entry.id,
          adjustment: {
            date: q.date,
            original: r.entry.expected_cents,
            ...r.charges,
            agreed: r.charges.total,
            note: `${q.source}${q.latest ? ` · índice até ${q.latest}` : ''}`,
            rate: r.rate,
          },
        } });
      }
      onSaved();
      setResult(output);
      toast.success('Parcelas atualizadas e fatura pronta.');
    } catch (e) {
      toast.error((e as Error).message);
      onSaved();
    } finally {
      setBusy(false);
    }
  }

  return <Dialog open onOpenChange={open => !open && !busy && onClose()}>
    <DialogContent className="max-h-[90dvh] max-w-2xl overflow-y-auto">
      <DialogHeader>
        <DialogTitle>{result ? 'Fatura pronta' : 'Atualizar parcelas e gerar fatura'}</DialogTitle>
        <DialogDescription>{contract.title} · {ids.length} parcela(s)</DialogDescription>
      </DialogHeader>
      {!result ? <div className="space-y-4">
        <label className="block space-y-1.5 text-sm">
          Data prevista de pagamento
          <Input type="date" required value={date} onChange={e => { setDate(e.target.value); setQ(null); setError(''); }} />
        </label>
        {official && <div className="space-y-2 text-sm">
          <p>Correção monetária contratada: <strong>{contract.correction_index}</strong></p>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Origem da correção">
            <Button type="button" variant={!manualMode ? 'secondary' : 'outline'} onClick={() => changeMode(false)}>Índice oficial</Button>
            <Button type="button" variant={manualMode ? 'secondary' : 'outline'} onClick={() => changeMode(true)}>Taxa manual</Button>
          </div>
          <p className="text-xs text-muted-foreground">
            O índice oficial só é aplicado após a publicação da competência necessária. Se estiver pendente, o Axion não apresentará a correção como 0%.
          </p>
        </div>}
        {manualRequired && <label className="block space-y-1.5 text-sm">
          Taxa acumulada {contract.correction_index} (%) — informada manualmente
          <Input value={manual} inputMode="decimal" placeholder="Ex.: 0,50" onChange={e => { setManual(e.target.value); setQ(null); setError(''); }} />
          <span className="block text-xs text-muted-foreground">Use apenas se a taxa e o método estiverem previstos no contrato. Essa taxa não será identificada como índice oficial.</span>
        </label>}
        <Button type="button" variant="outline" disabled={busy || (manualRequired && !manualValid)} onClick={calculate}>
          {busy ? 'Calculando…' : 'Calcular atualização'}
        </Button>
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        <InvoiceRecipientFields value={recipient} onChange={setRecipient} />
        {q && <>
          <div className="space-y-3 border-y py-3">
            {q.rows.map(r => <div key={r.entry.id} className="text-sm">
              <strong>Parcela {r.entry.number} · {formatDateBR(r.entry.due_date)}</strong>
              <dl className="mt-2 grid grid-cols-2 gap-1">
                <dt>Original</dt><dd className="text-right">{formatBRL(r.entry.expected_cents)}</dd>
                <dt>Juros ({r.charges.days} dias)</dt><dd className="text-right">{formatBRL(r.charges.interestCents)}</dd>
                <dt>Multa</dt><dd className="text-right">{formatBRL(r.charges.fineCents)}</dd>
                <dt>Correção ({r.rate.toFixed(6)}%)</dt><dd className="text-right">{formatBRL(r.charges.correctionCents)}</dd>
                <dt className="font-bold">Atualizado</dt><dd className="text-right font-bold">{formatBRL(r.charges.total)}</dd>
              </dl>
            </div>)}
            <div className="flex justify-between font-bold"><span>Total a cobrar</span><span>{formatBRL(q.total)}</span></div>
          </div>
          {contract.correction_index !== 'Sem correção' && <p className="text-xs text-muted-foreground">
            Origem: {q.source}{q.latest ? ` · Último índice publicado: ${q.latest}` : ''}. {q.convention}
          </p>}
          <Button type="button" variant="brand" disabled={busy} onClick={confirm}>
            {busy ? 'Gerando…' : 'Confirmar e gerar fatura'}
          </Button>
        </>}
      </div> : <div className="space-y-4">
        <img src={result.qr} alt="QR Code Pix da fatura" className="mx-auto size-52" />
        <p className="text-center text-xl font-bold">{formatBRL(q?.total)}</p>
        <div className="flex flex-wrap justify-center gap-2">
          <Button type="button" variant="brand" onClick={() => deliverInvoice(result.blob, `fatura-${contract.id.slice(0, 8)}.pdf`)}><Download />Baixar fatura PDF</Button>
          <Button type="button" variant="outline" onClick={() => {
            void navigator.clipboard.writeText(result.payload)
              .then(() => toast.success('Pix copiado.'))
              .catch(() => toast.error('Não foi possível copiar o Pix.'));
          }}><Copy />Copiar Pix</Button>
        </div>
      </div>}
    </DialogContent>
  </Dialog>;
}
