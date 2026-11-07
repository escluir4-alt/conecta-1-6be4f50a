import { Link, createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { ArrowLeft, History, Mic, Paperclip, Send, Settings, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useRequireUser } from "@/components/AppShell";
import { axionAcceptTransfer, axionCancelTransfer, axionRequestTransfer, axionAsk, axionDelete, axionList, axionLoad, axionPreferences, axionSave, axionSavePreferences, axionSaveProvider, axionSaveGemini, axionStatus } from "@/lib/axion/axion.functions";
import type { Conversation, Message, Scope } from "@/lib/axion/contracts";

export const Route = createFileRoute("/assistente")({
  head: () => ({ meta: [{ title: "Axion IA — Conecta" }] }),
  component: Page,
});
type Dictation = {
  lang: string;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
};
const names: Record<Scope, string> = {
  internal: "Consultas internas — sem IA externa",
  free: "Conversa geral — Gemini gratuito",
  general: "Conversa geral — OpenAI (pode cobrar)",
  private: "Consultar registros — OpenAI (pode cobrar)",
  web: "Pesquisar na web — OpenAI (pode cobrar)",
};

function Page() {
  const user = useRequireUser();
  const status = useServerFn(axionStatus);
  const capability = useQuery({ queryKey: ["axion-access", user?.email], queryFn: () => status(), enabled: !!user });
  if (!user || capability.isPending) return <p className="p-6">Verificando acesso…</p>;
  if (capability.data?.incoming)
    return <AcceptTransfer onAccepted={async () => { await capability.refetch(); }} />;
  if (capability.isError || !capability.data?.owner)
    return <div className="p-6"><p>Axion IA disponível apenas ao titular autorizado.</p><Link to="/painel">Voltar ao painel</Link></div>;
  return <ConfiguredChat key={user.email} email={user.email} access={capability.data} onConfigured={async () => { await capability.refetch(); }} />;
}

function AcceptTransfer({ onAccepted }: { onAccepted: () => Promise<void> }) {
  const accept = useServerFn(axionAcceptTransfer);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return <main className="mx-auto max-w-xl space-y-4 p-6">
    <h1 className="text-xl font-semibold">Transferência da Axion IA</h1>
    <p>Você receberá acesso como titular. As conversas e a chave do titular anterior não serão transferidas.</p>
    <Button disabled={busy} onClick={async () => {
      setBusy(true);
      setError("");
      try { await accept(); await onAccepted(); } catch (e) { setError(e instanceof Error ? e.message : "Transferência não concluída."); }
      finally { setBusy(false); }
    }}>Aceitar titularidade</Button>
    {error && <p role="alert">{error}</p>}
  </main>;
}

function fresh(): Conversation {
  return { id: crypto.randomUUID(), title: "Nova conversa", revision: null, archived: false, branches: [[]] };
}

type Preferences = { tone: "direto" | "detalhado"; deep: boolean; memory: string };
type Access = { geminiSetup: boolean; geminiConfigured: boolean; configured: boolean; web: boolean; setup: boolean; provider: { model: string; max_request_cents: number; web: boolean } | null };
type ConfiguredProps = { email: string; access: Access; onConfigured: () => Promise<void> };
function ConfiguredChat({ email, access, onConfigured }: ConfiguredProps) {
  const getPreferences = useServerFn(axionPreferences);
  const prefs = useQuery({ queryKey: ["axion-preferences", email], queryFn: () => getPreferences() });
  if (prefs.isPending) return <p className="p-6">Carregando preferências…</p>;
  if (prefs.isError) return <p role="alert" className="p-6">Não foi possível carregar as preferências da Axion.</p>;
  return <Chat access={access} email={email} onConfigured={onConfigured} initial={prefs.data} />;
}
function Chat({ access, email, onConfigured, initial }: ConfiguredProps & { initial: Preferences }) {
  const { configured, web, setup, provider } = access;
  const saveProvider = useServerFn(axionSaveProvider);
  const saveGemini = useServerFn(axionSaveGemini);
  const [geminiKey, setGeminiKey] = useState("");
  const [unbilled, setUnbilled] = useState(false);
  const [geminiNotice, setGeminiNotice] = useState("");
  const requestTransfer = useServerFn(axionRequestTransfer);
  const cancelTransfer = useServerFn(axionCancelTransfer);
  const [targetEmail, setTargetEmail] = useState("");
  const [transferNotice, setTransferNotice] = useState("");
  const [providerKey, setProviderKey] = useState("");
  const [providerModel, setProviderModel] = useState(provider?.model ?? "");
  const [providerCents, setProviderCents] = useState(String(provider?.max_request_cents ?? ""));
  const [providerWeb, setProviderWeb] = useState(provider?.web ?? false);
  const [providerNotice, setProviderNotice] = useState("");
  const ask = useServerFn(axionAsk), save = useServerFn(axionSave), load = useServerFn(axionLoad);
  const list = useServerFn(axionList), remove = useServerFn(axionDelete);
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [branch, setBranch] = useState(0);
  const [question, setQuestion] = useState("");
  const [image, setImage] = useState<string>();
  const [scope, setScope] = useState<Scope>(access.geminiConfigured ? "free" : "internal");
  const savePreferences = useServerFn(axionSavePreferences);
  const [saved, setSaved] = useState(initial);
  const [tone, setTone] = useState(initial.tone);
  const [deep, setDeep] = useState(initial.deep);
  const [memory, setMemory] = useState(initial.memory);
  const [includeMemory, setIncludeMemory] = useState(false);
  const [edit, setEdit] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [dictation, setDictation] = useState<Dictation | null>(null);
  const [error, setError] = useState("");
  const [panel, setPanel] = useState<"history" | "settings" | null>(null);
  const [filter, setFilter] = useState("");
  const isPaid = scope === "general" || scope === "private" || scope === "web";
  const allowsMedia = scope === "general" || scope === "private";
  const ready = scope === "internal" || (scope === "free" ? access.geminiConfigured : configured && (scope !== "web" || web));
  const messages = conversation?.branches[branch] ?? [];
  const history = useQuery({ queryKey: ["axion-history", email], queryFn: () => list(), enabled: panel === "history", staleTime: 0 });
  function reset(next: Conversation | null) {
    setConversation(next); setBranch(Math.max(0, (next?.branches.length ?? 1) - 1)); setEdit(null);
    setQuestion(""); setImage(undefined); setScope(access.geminiConfigured ? "free" : "internal"); setIncludeMemory(false); setError("");
  }
  function messageError(e: unknown) { setError(e instanceof Error ? e.message : "A operação não foi concluída."); }
  async function persist(next: Conversation) {
    setConversation(next);
    const r = await save({ data: next });
    setConversation({ ...next, revision: r.revision });
    void history.refetch();
  }
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (busy || !ready || !question.trim()) return;
    if (isPaid && !window.confirm("Este modo usa OpenAI e pode gerar cobrança. Continuar?")) return;
    const c = conversation ?? fresh();
    if (edit !== null && c.branches.length >= 12) { setError("Limite de versões. Exporte e comece outra conversa."); return; }
    const prior = edit === null ? messages : messages.slice(0, edit);
    if (prior.length > 38) { setError("Esta versão atingiu o limite de mensagens. Comece outra conversa."); return; }
    setBusy(true); setError("");
    try {
      const answer = await ask({ data: { question, scope, tone: saved.tone, deep: saved.deep, includeMemory: allowsMedia && includeMemory, history: prior, ...(allowsMedia && image ? { image } : {}) } });
      const next: Message[] = [...prior, { role: "user", scope, usesMemory: allowsMedia && includeMemory, text: question.trim() + (image ? "\n[Imagem analisada; original não guardado]" : "") }, answer];
      const branches = edit === null ? c.branches.map((b, i) => i === branch ? next : b) : [...c.branches, next];
      if (edit !== null) setBranch(branches.length - 1);
      setQuestion(""); setImage(undefined); setEdit(null);
      await persist({ ...c, title: c.revision === null ? question.trim().slice(0, 70) : c.title, branches });
    } catch (e) { messageError(e); }
    finally { setBusy(false); }
  }
  async function action(fn: () => Promise<void>) {
    if (busy) return;
    setBusy(true); setError("");
    try { await fn(); } catch (e) { messageError(e); } finally { setBusy(false); }
  }
  function exportConversation() {
    if (!conversation) return;
    const url = URL.createObjectURL(new Blob([JSON.stringify(conversation, null, 2)], { type: "application/json" }));
    const a = document.createElement("a"); a.href = url; a.download = "axion-conversa.json"; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }
  function dictate() {
    if (dictation) { dictation.stop(); return; }
    const browser = window as typeof window & { SpeechRecognition?: new () => Dictation; webkitSpeechRecognition?: new () => Dictation };
    const Recognition = browser.SpeechRecognition ?? browser.webkitSpeechRecognition;
    if (!Recognition) { setError("Este navegador não oferece ditado. Use o microfone do teclado ou digite."); return; }
    if (!window.confirm("O navegador pode enviar o áudio ao serviço de reconhecimento de voz. Continuar?")) return;
    const mic = new Recognition();
    mic.lang = "pt-BR";
    mic.onresult = e => setQuestion(old => (old + " " + (e.results[0]?.[0]?.transcript ?? "")).trim().slice(0, 4000));
    mic.onerror = () => { setError("Não foi possível captar o áudio."); setDictation(null); };
    mic.onend = () => setDictation(null);
    try { mic.start(); setDictation(mic); } catch (e) { messageError(e); }
  }
  function attach(file: File | undefined) {
    if (!file) return;
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type) || file.size > 1_000_000) {
      setError("Selecione uma imagem PNG, JPEG ou WebP de até 1 MB."); return;
    }
    const reader = new FileReader();
    reader.onload = () => setImage(String(reader.result));
    reader.onerror = () => setError("Não foi possível ler a imagem.");
    reader.readAsDataURL(file);
  }

  return <main className="mx-auto flex min-h-dvh max-w-3xl flex-col gap-5 px-4 py-4 md:px-8">
    <header className="flex flex-wrap items-center justify-between gap-2 border-b pb-3">
      <Link to="/painel" className="flex items-center gap-2 text-sm" aria-label="Voltar ao painel"><ArrowLeft size={16} /> Axion IA</Link>
      <div className="flex flex-wrap gap-1">
        <Button variant="ghost" disabled={busy} onClick={() => reset(null)}>Nova conversa</Button>
        <Button variant="ghost" aria-expanded={panel === "history"} onClick={() => setPanel(panel === "history" ? null : "history")}><History size={16} /> Histórico</Button>
        <Button variant="ghost" aria-expanded={panel === "settings"} onClick={() => { setProviderKey(""); setGeminiKey(""); setUnbilled(false); setPanel(panel === "settings" ? null : "settings"); }}><Settings size={16} /> Configuração</Button>
      </div>
    </header>
    {panel === "settings" && <section aria-label="Configuração" className="grid gap-3 rounded-xl border p-4 text-sm">
      <label>Contexto <select className="ml-2 rounded border bg-background p-1" value={scope} disabled={busy} onChange={e => { setScope(e.target.value as Scope); setImage(undefined); setIncludeMemory(false); }}>
        {Object.entries(names).map(([id, label]) => <option key={id} value={id} disabled={id === "free" ? !access.geminiConfigured : id !== "internal" && (!configured || (id === "web" && !web))}>{label}</option>)}
      </select></label>
      <p>Consultas internas não chamam modelos externos. O Gemini recebe apenas o texto da pergunta atual; não digite dados privados nesse modo. Modos OpenAI são opcionais e podem cobrar.</p>
      <label>Tom <select className="ml-2 rounded border bg-background p-1" value={tone} onChange={e => setTone(e.target.value as typeof tone)}><option value="direto">Direto</option><option value="detalhado">Detalhado</option></select></label>
      <label><input type="checkbox" checked={deep} onChange={e => setDeep(e.target.checked)} /> Análise aprofundada</label>
      <label>Memória pessoal (editável)
        <Textarea value={memory} maxLength={2000} onChange={e => setMemory(e.target.value)} placeholder="Registre apenas fatos que deseja lembrar." />
      </label>
      <label><input type="checkbox" checked={includeMemory && allowsMedia} disabled={!allowsMedia || !saved.memory} onChange={e => setIncludeMemory(e.target.checked)} /> Enviar memória salva ao modelo nesta conversa</label>
      <Button variant="outline" disabled={busy} onClick={() => void action(async () => { setSaved(await savePreferences({ data: { tone, deep, memory } })); })}>Salvar configuração</Button>
      <h2 className="border-t pt-3 font-semibold">Gemini gratuito</h2>
      {access.geminiSetup ? <>
        <p>Crie a chave no <a className="underline" href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer">Google AI Studio</a>, em um projeto sem faturamento. A Axion não consegue verificar se o projeto tem cobrança ativa.</p>
        {access.geminiConfigured && <p>Chave Gemini cadastrada. Preencha abaixo somente se quiser trocá-la.</p>}
        <label>Chave Gemini<Input type="password" autoComplete="off" spellCheck={false} maxLength={200} value={geminiKey} onChange={e => setGeminiKey(e.target.value)} /></label>
        <label><input type="checkbox" checked={unbilled} onChange={e => setUnbilled(e.target.checked)} /> Confirmei que o projeto desta chave está sem faturamento.</label>
        <Button type="button" disabled={busy || !unbilled || !geminiKey.trim()} onClick={() => {
          const key = geminiKey.trim();
          setGeminiKey("");
          setGeminiNotice("");
          void action(async () => {
            await saveGemini({ data: { key, unbilled: true } });
            await onConfigured();
            setScope("free"); setImage(undefined); setIncludeMemory(false);
            setGeminiNotice("Chave salva. Envie uma pergunta de conversa geral para testar.");
          });
        }}>Salvar Gemini</Button>
        {geminiNotice && <p role="status">{geminiNotice}</p>}
      </> : <p>O cadastro de chave Gemini está indisponível neste ambiente.</p>}
      <h2 className="border-t pt-3 font-semibold">Provedor OpenAI (opcional, pode cobrar)</h2>
      {setup ? <>
        <p>A chave fica no cofre do servidor e não volta à tela. {provider ? "Chave cadastrada: deixe em branco para mantê-la." : "Informe uma chave de API da sua conta OpenAI."}</p>
        <label>Chave da API<Input type="password" autoComplete="off" spellCheck={false} maxLength={512} value={providerKey} onChange={e => setProviderKey(e.target.value)} /></label>
        <label>Modelo da API<Input value={providerModel} maxLength={120} onChange={e => setProviderModel(e.target.value)} /></label>
        <label>Estimativa máxima por chamada em centavos (1 a 3000)<Input type="number" min={1} max={3000} step={1} value={providerCents} onChange={e => setProviderCents(e.target.value)} /></label>
        <p>Use um limite superior que inclua tokens, imagens, busca, câmbio e taxas. O valor é uma reserva, não um preço calculado.</p>
        <label><input type="checkbox" checked={providerWeb} onChange={e => setProviderWeb(e.target.checked)} /> Ativar busca (confira a cobrança do modelo)</label>
        <Button type="button" disabled={busy || !providerModel.trim() || !providerCents || (!provider && !providerKey.trim())} onClick={() => {
          setProviderNotice("");
          const cents = Number(providerCents);
          if (!Number.isInteger(cents) || cents < 1 || cents > 3000) { setError("Informe um limite inteiro de 1 a 3000 centavos."); return; }
          const key = providerKey.trim();
          setProviderKey("");
          void action(async () => {
            await saveProvider({ data: { key, model: providerModel.trim(), cents, web: providerWeb } });
            await onConfigured();
            setProviderNotice("Configuração salva. Envie uma mensagem curta para testar o provedor.");
          });
        }}>Salvar provedor</Button>
        {providerNotice && <p role="status">{providerNotice}</p>}
      </> : <p>A configuração pelo app está indisponível neste ambiente. Use os segredos do servidor.</p>}
      <h2 className="border-t pt-3 font-semibold">Alterar titular</h2>
      <p>A nova conta precisa estar confirmada no Conecta. Ela terá 15 minutos para entrar e aceitar em /assistente. Seu histórico e sua chave não serão transferidos.</p>
      <label>E-mail da nova conta<Input type="email" value={targetEmail} onChange={e => setTargetEmail(e.target.value)} /></label>
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" disabled={busy || !targetEmail.trim()} onClick={() => void action(async () => {
          await requestTransfer({ data: targetEmail });
          setTargetEmail("");
          setTransferNotice("Solicitação criada. A nova conta deve entrar no Conecta e abrir /assistente.");
        })}>Solicitar transferência</Button>
        <Button type="button" variant="ghost" disabled={busy} onClick={() => void action(async () => {
          await cancelTransfer();
          setTransferNotice("Transferência pendente cancelada.");
        })}>Cancelar transferência pendente</Button>
      </div>
      {transferNotice && <p role="status">{transferNotice}</p>}
      <p>As reservas para chamadas de IA têm teto de R$ 30 por mês. O uso depende da configuração do servidor.</p>
    </section>}
    {panel === "history" && <section aria-label="Histórico" className="grid gap-2 rounded-xl border p-4">
      <Input value={filter} onChange={e => setFilter(e.target.value)} placeholder="Buscar nos 100 títulos mais recentes" aria-label="Buscar conversa" />
      {history.isPending && <p>Carregando…</p>}
      {history.isError && <p role="alert">Não foi possível carregar o histórico.</p>}
      {(history.data ?? []).filter(c => c.title.toLowerCase().includes(filter.toLowerCase())).map(c =>
        <Button key={c.id} disabled={busy} variant="ghost" className="justify-start truncate" onClick={() => void action(async () => { reset(await load({ data: c.id })); setPanel(null); })}>
          {c.title}{c.archived ? " (arquivada)" : ""}
        </Button>)}
      {conversation && <div className="flex flex-wrap gap-2">
        <Button variant="outline" disabled={busy} onClick={exportConversation}>Exportar</Button>
        <Button variant="outline" disabled={busy || conversation.revision === null} onClick={() => {
          const title = window.prompt("Novo título", conversation.title)?.trim();
          if (title) void action(() => persist({ ...conversation, title: title.slice(0, 120) }));
        }}>Renomear</Button>
        <Button variant="outline" disabled={busy || conversation.revision === null} onClick={() => void action(() => persist({ ...conversation, archived: !conversation.archived }))}>{conversation.archived ? "Desarquivar" : "Arquivar"}</Button>
        <Button variant="destructive" disabled={busy || conversation.revision === null} onClick={() => {
          if (conversation.revision !== null && window.confirm("Excluir a conversa e todas as suas versões?")) {
            const { id, revision } = conversation;
            void action(async () => { await remove({ data: { id, revision } }); reset(null); await history.refetch(); });
          }
        }}>Excluir</Button>
      </div>}
    </section>}
    {!access.geminiConfigured && <p role="status" className="rounded-xl border p-3 text-sm">As consultas internas já estão disponíveis. Para conversa geral, cadastre sua chave em Configuração → Gemini gratuito.</p>}
    <div className="flex flex-wrap gap-2" aria-label="Consultas gratuitas do Conecta">
      {["Quanto falta pagar neste mês?", "O que vence nos próximos 7 dias?", "Quais são meus próximos compromissos?", "Quais as receitas previstas?"].map(q =>
        <Button key={q} type="button" variant="outline" size="sm" disabled={busy} onClick={() => {
          setScope("internal"); setImage(undefined); setIncludeMemory(false); setEdit(null); setQuestion(q);
        }}>{q}</Button>)}
      {access.geminiConfigured && <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => {
        setScope("free"); setImage(undefined); setIncludeMemory(false); setEdit(null);
      }}>Conversar com Gemini</Button>}
    </div>
    {(conversation?.branches.length ?? 0) > 1 && <label className="text-sm">Versão <select disabled={busy} value={branch} onChange={e => { setBranch(Number(e.target.value)); setEdit(null); setQuestion(""); }} className="ml-2 rounded border bg-background p-1">
      {conversation?.branches.map((_, i) => <option key={i} value={i}>Versão {i + 1}</option>)}
    </select></label>}
    <section aria-label="Conversa" role="log" className="flex flex-1 flex-col gap-5">
      {!messages.length && <p className="my-auto py-12 text-center text-xl">Como posso ajudar?</p>}
      {messages.map((m, i) => <article key={i} className={m.role === "user" ? "ml-auto max-w-[90%] rounded-2xl bg-muted p-3" : "min-w-0"}>
        <div className="text-xs text-muted-foreground">{m.role === "user" ? "Você" : "Axion IA"} · {names[m.scope]}</div>
        <p className="mt-1 whitespace-pre-wrap break-words">{m.text}</p>
        {m.sources?.map(s => <a key={s.url} href={s.url} rel="noopener noreferrer" target="_blank" className="mr-2 inline-block max-w-full break-all text-sm underline">{s.title}</a>)}
        {m.role === "user" ? <Button variant="ghost" size="sm" disabled={busy} onClick={() => { setEdit(i); setQuestion(m.text.slice(0, 4000)); setScope(m.scope === "internal" ? "internal" : access.geminiConfigured ? "free" : "internal"); setImage(undefined); setIncludeMemory(false); }}>Editar e criar versão</Button> :
          <Button variant="ghost" size="sm" aria-label="Ler em voz alta" onClick={() => {
            if (!("speechSynthesis" in window)) { setError("Leitura em voz alta indisponível neste navegador."); return; }
            window.speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(m.text); u.lang = "pt-BR"; window.speechSynthesis.speak(u);
          }}><Volume2 size={16} /></Button>}
      </article>)}
      {busy && <p role="status" className="text-sm text-muted-foreground">Processando…</p>}
    </section>
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    <form onSubmit={submit} className="sticky bottom-0 grid gap-2 rounded-2xl border bg-background p-3 shadow-sm">
      {edit !== null && <p className="text-xs">Editando em nova versão. <button type="button" className="underline" onClick={() => { setEdit(null); setQuestion(""); }}>Cancelar</button></p>}
      <Textarea aria-label="Mensagem para a Axion IA" value={question} disabled={busy} onChange={e => setQuestion(e.target.value)} maxLength={4000} placeholder="Pergunte à Axion IA" />
      <div className="flex flex-wrap items-center gap-2">
        <label title="Anexar imagem" className="flex cursor-pointer items-center rounded border p-2">
          <Paperclip size={16} /><span className="sr-only">Anexar imagem</span>
          <input className="sr-only" type="file" accept="image/png,image/jpeg,image/webp" disabled={busy || !allowsMedia} onChange={e => { attach(e.target.files?.[0]); e.target.value = ""; }} />
        </label>
        <Button type="button" size="icon" variant="outline" disabled={busy} aria-label={dictation ? "Parar ditado" : "Ditar mensagem"} onClick={dictate}><Mic size={16} /></Button>
        {image && <Button type="button" variant="ghost" disabled={busy} onClick={() => setImage(undefined)}>Remover imagem</Button>}
        <span className="mr-auto text-xs text-muted-foreground">{names[scope]}</span>
        <Button type="submit" disabled={busy || !!dictation || !ready || !question.trim()}><Send size={16} /> Enviar</Button>
      </div>
    </form>
  </main>;
}
