import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import {
  calculateAwardComparison,
  isExpiringWithinDays,
  parseLocalizedNumber,
} from "@/lib/travel-loyalty-utils";
import {
  deleteTravelLoyaltyProgram,
  insertTravelLoyaltyProgram,
  listTravelLoyaltyPrograms,
  type TravelLoyaltyProgramRow,
} from "@/lib/travel-loyalty";

type ProgramType = "milhas" | "pontos";
type LoyaltyProgram = {
  id: string;
  program: string;
  type: ProgramType;
  balance: number;
  expiration: string;
  valuePerPoint: number;
  notes: string;
};
type SyncState = "loading" | "synced" | "local" | "error";

const PROGRAM_OPTIONS = [
  "Smiles", "LATAM Pass", "TudoAzul", "Livelo", "Esfera", "AAdvantage",
  "TAP Miles&Go", "Azul Viagens", "GolCart", "Outros",
] as const;

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency", currency: "BRL", maximumFractionDigits: 2,
  }).format(Number.isFinite(value) ? value : 0);
}

function formatDate(value: string): string {
  if (!value) return "Sem data";
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return value;
  return new Intl.DateTimeFormat("pt-BR").format(new Date(year, month - 1, day));
}

function fromRow(row: TravelLoyaltyProgramRow): LoyaltyProgram {
  return {
    id: row.id,
    program: row.program_name,
    type: row.program_type,
    balance: row.balance,
    expiration: row.expiration_date ?? "",
    valuePerPoint: Number(row.value_per_point) || 0,
    notes: row.notes ?? "",
  };
}

function readLocal(storageKey: string): LoyaltyProgram[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(storageKey) ?? "[]");
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is LoyaltyProgram =>
      !!item && typeof item === "object" &&
      typeof item.id === "string" && typeof item.program === "string" &&
      (item.type === "milhas" || item.type === "pontos") &&
      typeof item.balance === "number" && typeof item.valuePerPoint === "number",
    );
  } catch {
    return [];
  }
}

function writeLocal(storageKey: string, programs: LoyaltyProgram[]) {
  try {
    localStorage.setItem(storageKey, JSON.stringify(programs));
  } catch {
    // Keep the current session usable if browser storage is disabled or full.
  }
}

const isUuid = (value: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

async function saveLocalToCloud(userId: string, localItems: LoyaltyProgram[]) {
  for (const item of localItems) {
    const { error } = await insertTravelLoyaltyProgram({
      id: isUuid(item.id) ? item.id : crypto.randomUUID(),
      user_id: userId,
      program_name: item.program,
      program_type: item.type,
      balance: Math.max(0, Math.trunc(item.balance)),
      expiration_date: item.expiration || null,
      value_per_point: Math.max(0, item.valuePerPoint),
      notes: item.notes ?? "",
    });
    if (error) throw error;
  }
}

export function PontosMilhasModule({ userEmail }: { userEmail?: string }) {
  const storageKey = useMemo(
    () => `axion:viagens:pontos-milhas:${userEmail ?? "guest"}`,
    [userEmail],
  );
  const [programs, setPrograms] = useState<LoyaltyProgram[]>([]);
  const [program, setProgram] = useState<string>(PROGRAM_OPTIONS[0]);
  const [programType, setProgramType] = useState<ProgramType>("milhas");
  const [balance, setBalance] = useState("");
  const [expiration, setExpiration] = useState("");
  const [valuePerPoint, setValuePerPoint] = useState("0,015");
  const [notes, setNotes] = useState("");
  const [syncState, setSyncState] = useState<SyncState>("loading");
  const [status, setStatus] = useState("");
  const [cashValue, setCashValue] = useState("");
  const [neededMiles, setNeededMiles] = useState("");
  const [fees, setFees] = useState("0");
  const [comparisonValue, setComparisonValue] = useState("0,015");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const localItems = readLocal(storageKey);
      if (!userEmail) {
        if (!cancelled) {
          setPrograms(localItems);
          setSyncState("local");
        }
        return;
      }

      try {
        const { data: auth, error: authError } = await supabase.auth.getUser();
        if (authError || !auth.user?.id) throw authError ?? new Error("Sessão indisponível");
        let { data, error } = await listTravelLoyaltyPrograms(auth.user.id);
        if (error) throw error;

        const cloudItems = (data ?? []).map(fromRow);
        const cloudIds = new Set(cloudItems.map((item) => item.id));
        const pending = localItems.filter((item) => !isUuid(item.id) || !cloudIds.has(item.id));
        if (pending.length > 0) {
          await saveLocalToCloud(auth.user.id, pending);
          ({ data, error } = await listTravelLoyaltyPrograms(auth.user.id));
          if (error) throw error;
        }
        if (cancelled) return;
        const synced = (data ?? []).map(fromRow);
        setPrograms(synced);
        writeLocal(storageKey, synced);
        setSyncState("synced");
        setStatus("");
      } catch {
        if (!cancelled) {
          setPrograms(localItems);
          setSyncState("local");
          setStatus("Sem sincronização com a nuvem. Seus dados locais foram mantidos.");
        }
      }
    }
    void load();
    return () => { cancelled = true; };
  }, [storageKey, userEmail]);

  const totalBalance = programs.reduce((sum, item) => sum + item.balance, 0);
  const estimatedValue = programs.reduce((sum, item) => sum + item.balance * item.valuePerPoint, 0);
  const expiringSoon = programs.filter((item) => isExpiringWithinDays(item.expiration));
  const comparison = useMemo(() => calculateAwardComparison({
    cashFare: parseLocalizedNumber(cashValue),
    miles: parseLocalizedNumber(neededMiles),
    fees: parseLocalizedNumber(fees),
    valuePerMile: parseLocalizedNumber(comparisonValue),
  }), [cashValue, comparisonValue, fees, neededMiles]);

  async function addProgram() {
    const balanceValue = parseLocalizedNumber(balance);
    const pointValue = parseLocalizedNumber(valuePerPoint);
    if (balanceValue <= 0) {
      setStatus("Informe um saldo maior que zero.");
      return;
    }
    if (syncState === "loading") return;

    const item: LoyaltyProgram = {
      id: crypto.randomUUID(), program, type: programType,
      balance: Math.trunc(balanceValue), expiration,
      valuePerPoint: pointValue > 0 ? pointValue : 0.01, notes: notes.trim(),
    };
    const previous = programs;
    const next = [item, ...previous];
    setPrograms(next);
    writeLocal(storageKey, next);
    setBalance(""); setExpiration(""); setNotes("");
    setStatus("Programa salvo neste dispositivo.");

    if (!userEmail) {
      setSyncState("local");
      return;
    }
    setSyncState("loading");
    try {
      const { data: auth, error: authError } = await supabase.auth.getUser();
      if (authError || !auth.user?.id) throw authError ?? new Error("Sessão indisponível");
      const { error } = await insertTravelLoyaltyProgram({
        id: item.id,
        user_id: auth.user.id,
        program_name: item.program,
        program_type: item.type,
        balance: item.balance,
        expiration_date: item.expiration || null,
        value_per_point: item.valuePerPoint,
        notes: item.notes,
      });
      if (error) throw error;
      setSyncState("synced");
      setStatus("Programa sincronizado com a nuvem.");
    } catch {
      setSyncState("local");
      setStatus("Salvo localmente; será sincronizado quando a conexão estiver disponível.");
    }
  }

  async function removeProgram(item: LoyaltyProgram) {
    const previous = programs;
    const next = previous.filter((current) => current.id !== item.id);
    if (userEmail && syncState === "synced") {
      setSyncState("loading");
      try {
        const { data: auth, error: authError } = await supabase.auth.getUser();
        if (authError || !auth.user?.id) throw authError ?? new Error("Sessão indisponível");
        const { error } = await deleteTravelLoyaltyProgram(item.id, auth.user.id);
        if (error) throw error;
        setPrograms(next);
        writeLocal(storageKey, next);
        setSyncState("synced");
        setStatus("Programa removido.");
      } catch {
        setSyncState("error");
        setStatus("Não foi possível remover do Supabase. O registro foi mantido.");
      }
      return;
    }
    setPrograms(next);
    writeLocal(storageKey, next);
    setStatus("Registro removido deste dispositivo.");
  }

  const syncLabel = syncState === "synced"
    ? "Sincronizado com a nuvem"
    : syncState === "loading"
      ? "Sincronizando…"
      : syncState === "error"
        ? "Falha na sincronização"
        : "Modo local / offline";

  return (
    <section className="mt-8 rounded-2xl border bg-card p-5" aria-labelledby="loyalty-title">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Submódulo de viagens</p>
          <h2 id="loyalty-title" className="text-2xl font-bold">Pontos e milhas</h2>
        </div>
        <span className="w-fit rounded-full border bg-accent/30 px-3 py-1 text-xs font-medium text-muted-foreground" role="status">{syncLabel}</span>
      </div>
      {status && <p className="mt-3 text-sm text-muted-foreground" role="status" aria-live="polite">{status}</p>}

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border bg-background p-4"><p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">Saldo total</p><p className="mt-3 text-3xl font-bold">{totalBalance.toLocaleString("pt-BR")}</p><p className="mt-1 text-xs text-muted-foreground">pontos e milhas cadastrados</p></div>
        <div className="rounded-2xl border bg-background p-4"><p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">Valor estimado</p><p className="mt-3 text-3xl font-bold">{formatCurrency(estimatedValue)}</p><p className="mt-1 text-xs text-muted-foreground">estimativa, não valor garantido de resgate</p></div>
        <div className="rounded-2xl border bg-background p-4"><p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">Vencem em até 90 dias</p><p className="mt-3 text-3xl font-bold">{expiringSoon.length}</p><p className="mt-1 text-xs text-muted-foreground">saldos com data informada</p></div>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-2xl border bg-background p-4">
          <h3 className="text-lg font-semibold">Cadastrar programa</h3>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2"><Label htmlFor="loyalty-program">Programa</Label><select id="loyalty-program" className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={program} onChange={(event) => setProgram(event.target.value)}>{PROGRAM_OPTIONS.map((item) => <option key={item} value={item}>{item}</option>)}</select></div>
            <div className="space-y-2"><Label htmlFor="loyalty-type">Tipo</Label><select id="loyalty-type" className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={programType} onChange={(event) => setProgramType(event.target.value as ProgramType)}><option value="milhas">Milhas</option><option value="pontos">Pontos</option></select></div>
            <div className="space-y-2"><Label htmlFor="loyalty-balance">Saldo</Label><Input id="loyalty-balance" type="number" min="1" step="1" inputMode="numeric" value={balance} onChange={(event) => setBalance(event.target.value)} placeholder="Ex.: 35000" /></div>
            <div className="space-y-2"><Label htmlFor="loyalty-expiration">Validade (opcional)</Label><Input id="loyalty-expiration" type="date" value={expiration} onChange={(event) => setExpiration(event.target.value)} /></div>
            <div className="space-y-2"><Label htmlFor="loyalty-value">Valor estimado por ponto (R$)</Label><Input id="loyalty-value" inputMode="decimal" value={valuePerPoint} onChange={(event) => setValuePerPoint(event.target.value)} placeholder="0,015" /></div>
            <div className="space-y-2 sm:col-span-2"><Label htmlFor="loyalty-notes">Observações</Label><Input id="loyalty-notes" value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Ex.: conta pessoal ou pontos do cartão" /></div>
          </div>
          <div className="mt-4 flex justify-end"><Button type="button" onClick={() => void addProgram()} disabled={syncState === "loading"}>Adicionar programa</Button></div>
        </div>
        <div className="rounded-2xl border bg-background p-4"><h3 className="text-lg font-semibold">Alertas de validade</h3>{expiringSoon.length === 0 ? <p className="mt-4 text-sm text-muted-foreground">Nenhum saldo cadastrado vence nos próximos 90 dias.</p> : <ul className="mt-4 space-y-3 text-sm">{expiringSoon.map((item) => <li key={item.id} className="rounded-xl border border-amber-400/40 bg-amber-500/5 p-3"><p className="font-medium">{item.program}</p><p className="text-muted-foreground">{item.balance.toLocaleString("pt-BR")} {item.type} · vence em {formatDate(item.expiration)}</p></li>)}</ul>}</div>
      </div>

      <div className="mt-8 rounded-2xl border bg-background p-4"><h3 className="text-lg font-semibold">Minha carteira</h3>{programs.length === 0 ? <p className="mt-4 rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">Nenhum programa cadastrado ainda.</p> : <ul className="mt-4 grid gap-3 md:grid-cols-2">{programs.map((item) => <li key={item.id} className="flex min-w-0 items-center gap-3 rounded-xl border p-4"><div className="min-w-0 flex-1"><p className="truncate font-medium">{item.program} <span className="text-xs font-normal capitalize text-muted-foreground">· {item.type}</span></p><p className="mt-1 text-xl font-semibold">{item.balance.toLocaleString("pt-BR")}</p><p className={isExpiringWithinDays(item.expiration) ? "text-xs text-amber-700" : "text-xs text-muted-foreground"}>Validade: {formatDate(item.expiration)}{item.notes ? ` · ${item.notes}` : ""}</p></div><Button variant="ghost" size="sm" onClick={() => void removeProgram(item)} disabled={syncState === "loading"} aria-label={`Excluir ${item.program}`}>Excluir</Button></li>)}</ul>}</div>

      <div className="mt-8 rounded-2xl border bg-background p-4">
        <h3 className="text-lg font-semibold">Comparador de emissão</h3>
        <p className="mt-1 text-sm text-muted-foreground">Informe valores consultados por você. O comparador não pesquisa voos nem confirma disponibilidade de assentos.</p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-2"><Label htmlFor="cash-fare">Tarifa em dinheiro (R$)</Label><Input id="cash-fare" inputMode="decimal" value={cashValue} onChange={(event) => setCashValue(event.target.value)} placeholder="1500,00" /></div>
          <div className="space-y-2"><Label htmlFor="miles-needed">Milhas necessárias</Label><Input id="miles-needed" inputMode="numeric" value={neededMiles} onChange={(event) => setNeededMiles(event.target.value)} placeholder="25000" /></div>
          <div className="space-y-2"><Label htmlFor="award-fees">Taxas da emissão (R$)</Label><Input id="award-fees" inputMode="decimal" value={fees} onChange={(event) => setFees(event.target.value)} placeholder="0,00" /></div>
          <div className="space-y-2"><Label htmlFor="point-value">Valor estimado por milha (R$)</Label><Input id="point-value" inputMode="decimal" value={comparisonValue} onChange={(event) => setComparisonValue(event.target.value)} placeholder="0,015" /></div>
        </div>
        {comparison ? <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4" aria-live="polite"><div className="rounded-xl border bg-muted/30 p-4"><p className="text-xs text-muted-foreground">Custo econômico da emissão</p><p className="mt-2 text-xl font-bold">{formatCurrency(comparison.redemptionCost)}</p></div><div className="rounded-xl border bg-muted/30 p-4"><p className="text-xs text-muted-foreground">Diferença para tarifa em dinheiro</p><p className="mt-2 text-xl font-bold">{formatCurrency(comparison.savings)}</p></div><div className="rounded-xl border bg-muted/30 p-4"><p className="text-xs text-muted-foreground">Retorno implícito por milheiro</p><p className="mt-2 text-xl font-bold">{formatCurrency(comparison.effectiveCpm)}</p></div><div className="rounded-xl border bg-muted/30 p-4"><p className="text-xs text-muted-foreground">Indicação pelo valor informado</p><p className="mt-2 text-lg font-bold">{comparison.recommendation}</p></div></div> : <p className="mt-4 text-sm text-muted-foreground">Preencha tarifa, milhas e valor estimado para comparar.</p>}
      </div>
    </section>
  );
}

export default PontosMilhasModule;
