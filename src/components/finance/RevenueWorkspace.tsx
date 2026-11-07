import { useState } from 'react';
import { Link } from '@tanstack/react-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { ArrowLeft, ArrowRight, Copy, Paperclip, Plus, Printer, Pencil } from 'lucide-react';
import { toast } from 'sonner';
import { AppShell, useRequireUser } from '@/components/AppShell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { formatBRL, formatDateBR, diffLabel } from '@/lib/finance/money';
import { printRevenueDocument } from '@/lib/finance/revenue-document';
import { getRevenue, openRevenueFile, uploadRevenueFile } from '@/lib/finance/revenue.functions';
import { annualRevenue, receivedRevenue, revenueSourceKey, revenueSummary, revenueMonthEntries, revenueSettled, todayBR, type RevenueEntry, type RevenueContract, type RevenueSource } from '@/lib/finance/revenue';
import { NewRevenueDialog, ReceiveDialog, AdjustmentDialog, FileInput, uploadFiles } from './RevenueForms';
import { RevenueTable } from './RevenueTable';
import { ContractWorkspace } from './ContractWorkspace';

const MONTHS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
function monthLabel(month: string) {
  const label = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${month}-01T12:00:00Z`));
  return label.charAt(0).toUpperCase() + label.slice(1);
}
function Summary({ label, value, tone = 'text-primary' }: { label: string; value: string; tone?: string }) {
  return <div className="rounded-lg border bg-card p-4 shadow-soft"><div className="text-xs font-medium uppercase text-muted-foreground">{label}</div><div className={`mt-1.5 break-words text-xl font-extrabold ${tone}`}>{value}</div></div>;
}
export function RevenueWorkspace({ mode = 'registration', detailContractId }: { mode?: 'registration' | 'annual' | 'history' | 'contracts'; detailContractId?: string }) {
  const user = useRequireUser(); const qc = useQueryClient(); const today = todayBR();
  const [year, setYear] = useState(today.slice(0, 4)); const [historyYear, setHistoryYear] = useState(''); const [source, setSource] = useState('');
  const [editing, setEditing] = useState<RevenueSource | null>(null);
  const [search, setSearch] = useState(''); const [newOpen, setNewOpen] = useState(false);
  const [selected, setSelected] = useState<RevenueEntry | null>(null); const [contractId, setContractId] = useState<string | null>(null);
  const [adjust, setAdjust] = useState<RevenueEntry | null>(null); const [document, setDocument] = useState<string | null>(null);
  const [cell, setCell] = useState<{ title: string; entries: RevenueEntry[] } | null>(null);
  const [attachment, setAttachment] = useState<{ entryId: string | null; contractId: string | null } | null>(null); const [fileBusy, setFileBusy] = useState(false);
  const fetch = useServerFn(getRevenue); const openFile = useServerFn(openRevenueFile); const upload = useServerFn(uploadRevenueFile);
  const month = mode === 'annual' ? `${year}-${today.slice(5, 7)}` : today.slice(0, 7);
  const q = useQuery({ queryKey: ['revenue', user?.email, month], queryFn: () => fetch({ data: { month } }), enabled: !!user });
  const registeredSources = q.data?.sources ?? [];
  const entries = q.data?.entries ?? []; const contracts = q.data?.contracts ?? []; const files = q.data?.files ?? []; const events = q.data?.events ?? [];
  const years = [...new Set([today.slice(0, 4), year, ...entries.map(e => e.due_date.slice(0, 4))])].sort().reverse();
  // Recebimentos avulsos permanecem no histórico, mas não compõem a matriz anual.
  const annual = annualRevenue(entries, year).filter(entry => {
    const registered = registeredSources.find(source => source.id === entry.source_id);
    return (registered?.details as Record<string, unknown> | null)?.['axion_one_off'] !== 'true';
  });
  const annualSummary = revenueSummary(annual, today);
  const currentSource = (entry: RevenueEntry): RevenueEntry => {
    const source = registeredSources.find(s => s.id === entry.source_id);
    return source ? { ...entry, title: source.title, category: source.category } : entry;
  };
  const annualRows = [...new Map(annual.map(e => [revenueSourceKey(e), currentSource(e)])).values()];
  const sources = [...new Map(entries.filter(e => !e.contract_id).map(e => [revenueSourceKey(e), currentSource(e)])).values()].filter(e => e.title.toLowerCase().includes(search.toLowerCase()));
  const history = receivedRevenue(entries, historyYear, source); const groups = [...new Set(history.map(e => e.due_date.slice(0, 7)))].sort().reverse();
  const currentContract = contracts.find(c => c.id === contractId) ?? contracts[0];
  const installments = currentContract ? entries.filter(e => e.contract_id === currentContract.id) : [];
  const contractSummary = revenueSummary(installments, today); const receivedCount = installments.filter(e => e.received_date).length;

  function editSource(entry: RevenueEntry) {
    if (entry.contract_id) return;
    const source = registeredSources.find(s => s.id === entry.source_id);
    if (!source) { toast.error('Cadastro da receita não encontrado.'); return; }
    setCell(null); setEditing(source);
  }
  function saved() { void qc.invalidateQueries({ queryKey: ['revenue'] }); setCell(null); }
  function fileButton(e: RevenueEntry) { setAttachment({ entryId: e.id, contractId: null }); }

  async function openAttachment(id: string) {
    try { const { url } = await openFile({ data: { id } }); window.open(url, '_blank', 'noopener,noreferrer'); }
    catch (error) { toast.error((error as Error).message); }
  }

  async function attach(list: File[]) {
    if (!attachment) return;
    setFileBusy(true);
    try {
      await uploadFiles(upload, list, attachment.entryId, attachment.contractId);
      saved();
      toast.success('Arquivos anexados.');
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setFileBusy(false);
    }
  }

  async function copyReport() {
    const lines = ['Histórico de Receitas — Axion', ''];
    for (const g of groups) {
      lines.push(monthLabel(g), ['Fonte Pagadora', 'Valor previsto', 'Vencimento', 'Recebimento', 'Valor recebido', 'Diferença', 'Observação'].join('\t'));
      for (const e of history.filter(entry => entry.due_date.startsWith(g))) {
        lines.push([e.title, formatBRL(e.expected_cents), formatDateBR(e.due_date), formatDateBR(e.received_date), formatBRL(e.received_cents), diffLabel(e.expected_cents, e.received_cents), e.note].join('\t'));
      }
      lines.push('');
    }
    try {
      await navigator.clipboard.writeText(lines.join('\n'));
      toast.success('Relatório copiado para a área de transferência.');
    } catch {
      toast.error('Não foi possível copiar.');
    }
  }

  function contractDocument(c: RevenueContract) {
    setDocument(`CONTRATO — ${c.title}\nComprador: ${c.buyer}\nCPF: ${c.cpf} · RG: ${c.rg}\nContratado: ${formatBRL(c.total_cents)}\nRecebido: ${formatBRL(contractSummary.received)}\nEm aberto: ${formatBRL(contractSummary.pending)}\nJuros: ${c.interest_percent}% a.m.\n\nParcelas:\n${installments.map(e => `${String(e.number).padStart(3, '0')} — ${formatDateBR(e.due_date)} • Previsto ${formatBRL(e.expected_cents)} • Recebido ${formatBRL(e.received_cents)}`).join('\n')}\n\nAssinatura: __________________`);
  }

  const title = mode === 'history' ? 'Histórico de Receitas' : mode === 'annual' ? 'Contas a receber' : mode === 'contracts' ? 'Contratos parcelados' : 'Receitas';

  return <AppShell active={mode === 'history' ? 'historico-receitas' : mode === 'annual' ? 'contas-a-receber' : mode === 'contracts' ? 'crediario' : 'receitas'} user={user}><div className="p-6 lg:p-8">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><div className="text-xs font-semibold uppercase text-muted-foreground">Controle financeiro</div><h1 className="text-3xl font-extrabold tracking-tight">{title}</h1></div>
      <div className="no-print flex flex-wrap items-center gap-2">
        {mode === 'registration' && <><Button asChild variant="outline"><Link to="/contas-a-receber">Contas a receber <ArrowRight /></Link></Button><Button asChild variant="outline"><Link to="/crediario">Contratos parcelados</Link></Button><Button asChild variant="outline"><Link to="/historico-receitas">Histórico de receitas</Link></Button><Button variant="brand" onClick={() => setNewOpen(true)}><Plus />Nova receita</Button></>}
        {mode === 'annual' && <><Button asChild variant="brand"><Link to="/crediario">Contratos parcelados <ArrowRight /></Link></Button></>}
        {mode === 'contracts' && <Button asChild variant="outline"><Link to="/contas-a-receber"><ArrowLeft />Contas a receber</Link></Button>}
        {mode === 'history' && <><select aria-label="Ano do histórico" className="h-10 rounded-md border bg-card px-3 text-sm" value={historyYear} onChange={e => setHistoryYear(e.target.value)}><option value="">Todos os anos</option>{years.map(y => <option key={y} value={y}>{y}</option>)}</select><select aria-label="Fonte do histórico" className="h-10 max-w-full rounded-md border bg-card px-3 text-sm" value={source} onChange={e => setSource(e.target.value)}><option value="">Todas as fontes</option>{[...new Set(entries.filter(e => e.received_date).map(e => e.title))].sort().map(s => <option key={s} value={s}>{s}</option>)}</select><Button variant="outline" onClick={copyReport}><Copy />Copiar</Button><Button variant="outline" onClick={() => window.print()}><Printer />Imprimir / PDF</Button></>}
      </div></div>

    {q.error && <div role="alert" className="mt-5 flex flex-wrap items-center gap-3 bg-danger-soft p-4 text-sm text-destructive">{q.error.message}<Button variant="outline" onClick={() => q.refetch()}>Tentar novamente</Button></div>}
    {q.isLoading && <p className="py-12 text-center text-muted-foreground">Carregando receitas…</p>}
    {!q.isLoading && !q.error && <>
      {mode === 'registration' && <><div className="my-5"><Input aria-label="Buscar fonte de renda" placeholder="Buscar fonte pagadora" className="sm:w-64" value={search} onChange={e => setSearch(e.target.value)} /></div><div className="overflow-x-auto border bg-card"><table className="w-full min-w-[900px] text-sm"><thead><tr className="bg-muted text-xs uppercase text-muted-foreground">{['Fonte Pagadora', 'Categoria', 'Primeiro registro', 'Comprovantes', ''].map(h => <th key={h} className="px-4 py-3 text-left">{h}</th>)}</tr></thead><tbody className="divide-y">{sources.map(e => <tr key={revenueSourceKey(e)}><td className="px-4 py-3 font-semibold">{e.title}</td><td className="px-4 py-3">{e.category}</td><td className="px-4 py-3">{formatDateBR(entries.filter(r => revenueSourceKey(r) === revenueSourceKey(e)).sort((a,b) => a.due_date.localeCompare(b.due_date))[0]?.due_date)}</td><td className="px-4 py-3"><Button size="icon" variant="ghost" aria-label={`Comprovantes de ${e.title}`} title="Comprovantes" onClick={() => fileButton(e)}><Paperclip /></Button></td><td className="px-3 py-2"><Button size="icon" variant="ghost" aria-label={`Editar receita ${e.title}`} title="Editar receita" onClick={() => editSource(e)}><Pencil /></Button></td></tr>)}</tbody></table></div></>}

      {mode === 'annual' && <><div className="mt-5 flex flex-wrap items-center gap-3"><span className="rounded-md bg-success-soft px-3 py-1 text-xs font-bold text-success">Em andamento</span><label className="flex items-center gap-2 text-sm font-medium text-muted-foreground">Exercício:<select aria-label="Exercício" className="h-10 rounded-md border bg-card px-3 text-sm" value={year} onChange={e => setYear(e.target.value)}>{years.map(y => <option key={y} value={y}>{y}</option>)}</select></label></div>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-5"><Summary label="Total geral previsto" value={formatBRL(annualSummary.expected)} /><Summary label="Valor recebido no ano" value={formatBRL(annualSummary.received)} tone="text-success" /><Summary label="A receber no ano" value={formatBRL(annualSummary.pending)} tone="text-destructive" /><Summary label="Fontes registradas" value={String(annualRows.length)} /><Summary label="Status do exercício" value="Em andamento" /></div>
        <div className="mt-6 overflow-x-auto rounded-lg border bg-card shadow-soft"><table className="w-full min-w-[900px] text-sm"><thead><tr className="bg-muted text-xs uppercase text-muted-foreground"><th className="sticky left-0 z-10 bg-muted px-3 py-2.5 text-left">Fonte Pagadora</th><th className="px-3 py-2.5 text-center">Jan</th>{MONTHS.slice(1).map(m => <th key={m} className="px-2 py-2.5 text-center">{m}</th>)}<th className="px-3 py-2.5 text-right">Total anual</th></tr></thead><tbody className="divide-y">{annualRows.length ? annualRows.map(row => { const list = annual.filter(e => revenueSourceKey(e) === revenueSourceKey(row)); return <tr key={revenueSourceKey(row)}><td className="sticky left-0 z-10 bg-card px-3 py-2 font-semibold"><div className="flex items-center justify-between gap-2"><span>{row.title}</span>{!row.contract_id && <Button size="icon" variant="ghost" aria-label={`Editar receita ${row.title}`} title="Editar receita" onClick={() => editSource(row)}><Pencil /></Button>}</div></td>{MONTHS.map((m, i) => { const monthEntries = revenueMonthEntries(annual, row, `${year}-${String(i + 1).padStart(2, '0')}`); const paid = monthEntries.length > 0 && monthEntries.every(revenueSettled); return <td key={`${revenueSourceKey(row)}-${m}`} className={`px-2 py-2 text-center ${paid ? 'font-medium text-success' : ''}`}>{monthEntries.length ? <Button variant="ghost" className={`h-auto min-w-20 px-1 py-2 ${paid ? 'text-success' : ''}`} aria-label={`${row.title} — ${m} ${year}`} onClick={() => setCell({ title: `${row.title} — ${m} ${year}`, entries: monthEntries })}>{formatBRL(monthEntries.reduce((sum, e) => sum + e.expected_cents, 0))}</Button> : '—'}</td>; })}<td className="px-3 py-2 text-right font-bold">{formatBRL(list.reduce((sum, e) => sum + e.expected_cents, 0))}</td></tr>; }) : <tr><td colSpan={14} className="px-4 py-12 text-center text-muted-foreground">Nenhuma conta a receber neste exercício.</td></tr>}</tbody></table></div><Button className="mt-4" variant="outline" onClick={() => setNewOpen(true)}><Plus />Nova fonte de renda</Button></>}

      {mode === 'history' && <>{!history.length && <p className="mt-10 text-center text-muted-foreground">Nenhum recebimento confirmado encontrado.</p>}{groups.map(g => { const list = history.filter(e => e.due_date.startsWith(g)); return <section key={g} className="mt-6 border-t pt-4"><div className="mb-3 flex flex-wrap items-center justify-between gap-2"><h2 className="text-lg font-bold">{monthLabel(g)}</h2><span className="text-sm text-success">{list.length} recebimentos • {formatBRL(list.reduce((sum, e) => sum + (e.received_cents ?? 0), 0))}</span></div><RevenueTable entries={list} onReceive={setSelected} onFiles={fileButton} /></section>; })}{events.some(e => e.kind === 'correção') && <section className="mt-6 border-t pt-5"><h2 className="text-lg font-bold">Registro de alterações</h2><div className="mt-3 divide-y text-sm">{events.filter(e => e.kind === 'correção').map(e => <div key={e.id} className="py-3"><strong>{entries.find(r => r.id === e.entry_id)?.title}</strong><span className="ml-2 text-muted-foreground">{new Date(e.created_at).toLocaleString('pt-BR')}</span><p className="mt-1">{e.reason}</p></div>)}</div></section>}</>}

      {mode === 'contracts' && <ContractWorkspace contracts={contracts} entries={entries} contractId={detailContractId} onNew={()=>setNewOpen(true)} onReceive={setSelected} onFiles={fileButton} onSaved={saved} />}
    </>}

    {newOpen && <NewRevenueDialog month={month} contractOnly={mode === 'contracts'} onClose={() => setNewOpen(false)} onSaved={saved} />}

    {editing && <NewRevenueDialog month={month} editing={editing} onClose={() => setEditing(null)} onSaved={saved} />}

    {cell && (
      <Dialog open onOpenChange={o => !o && setCell(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{cell.title}</DialogTitle>
            <DialogDescription>Recebimentos do mês</DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            {cell.entries.map(entry => (
              <div key={entry.id} className="rounded-lg border p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold">{entry.title}</p>
                    <p className="text-sm text-muted-foreground">{formatDateBR(entry.due_date)}{entry.contract_id && ` · Parcela ${entry.number}`}</p>{entry.received_date && <p className="text-sm text-success">Recebido em {formatDateBR(entry.received_date)} · {formatBRL(entry.received_cents)}{entry.contract_id && (revenueSettled(entry) ? " · Quitada" : " · Parcial")}</p>}
                  </div>
                  <span className="font-semibold text-primary">{formatBRL(entry.expected_cents)}</span>
                </div>

                <div className="mt-3 flex items-center justify-between gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setCell(null);
                      setAttachment({ entryId: entry.id, contractId: null });
                    }}
                  >
                    Adicionar comprovante
                  </Button>

                  <Button
                    variant="brand"
                    size="sm"
                    onClick={() => {
                      setCell(null);
                      setSelected(entry);
                    }}
                  >
                    {entry.received_date ? 'Corrigir recebimento' : 'Confirmar recebimento'}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    )}

    {selected && <ReceiveDialog entry={selected} onClose={() => setSelected(null)} onSaved={saved} />}
    {adjust && currentContract && <AdjustmentDialog entry={adjust} contract={currentContract} onClose={() => setAdjust(null)} onSaved={saved} onDocument={setDocument} />}
    {attachment && <Dialog open onOpenChange={o => !o && !fileBusy && setAttachment(null)}><DialogContent><DialogHeader><DialogTitle>Comprovantes e arquivos</DialogTitle><DialogDescription>Documentos vinculados ao registro.</DialogDescription></DialogHeader><div className="space-y-2">{files.filter(f => attachment.entryId ? f.entry_id === attachment.entryId : f.contract_id === attachment.contractId).map(f => <Button key={f.id} variant="outline" className="w-full justify-start" onClick={() => openAttachment(f.id)}><Paperclip />{f.name}</Button>)}</div>{fileBusy ? <p className="mt-3 text-sm text-muted-foreground">Enviando…</p> : <FileInput onChange={attach} />}</DialogContent></Dialog>}
    {document && <Dialog open onOpenChange={o => !o && setDocument(null)}><DialogContent className="max-h-[90dvh] max-w-2xl overflow-y-auto"><DialogHeader><DialogTitle>Documento de Receitas</DialogTitle><DialogDescription>Atualização / contrato</DialogDescription></DialogHeader><pre className="whitespace-pre-wrap break-words font-sans text-sm">{document}</pre><Button variant="outline" onClick={() => { try { printRevenueDocument(document, null); } catch (error) { toast.error((error as Error).message); } }}> <Printer /> PDF / Impressão </Button></DialogContent></Dialog>}
  </div></AppShell>;
}
