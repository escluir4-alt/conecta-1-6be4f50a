import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";

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

type TravelLoyaltyProgramRow = {
  id: string;
  user_id: string;
  program_name: string;
  program_type: ProgramType;
  balance: number;
  expiration_date: string | null;
  value_per_point: number;
  notes: string;
  created_at: string;
  updated_at: string;
};

const PROGRAM_OPTIONS = [
  "Smiles",
  "LATAM Pass",
  "TudoAzul",
  "Livelo",
  "Esfera",
  "AAdvantage",
  "TAP Miles&Go",
  "Azul Viagens",
  "GolCart",
  "Outros",
] as const;

const formatCurrency = (value: number | null) => {
  if (value === null || Number.isNaN(value)) return "R$ 0,00";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 2,
  }).format(value);
};

const formatDate = (value: string) => {
  if (!value) return "Sem data";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("pt-BR").format(date);
};

const parseNumber = (raw: string) => {
  const normalized = raw.replace(".", "").replace(",", ".");
  const value = Number(normalized);
  return Number.isFinite(value) ? value : 0;
};

const isExpiringSoon = (expiration: string) => {
  if (!expiration) return false;
  const target = new Date(expiration);
  if (Number.isNaN(target.getTime())) return false;
  const difference = target.getTime() - Date.now();
  const days = difference / (1000 * 60 * 60 * 24);
  return days <= 90 && days >= 0;
};

const defaultPrograms: LoyaltyProgram[] = [
  {
    id: "sample-smiles",
    program: "Smiles",
    type: "milhas",
    balance: 35000,
    expiration: "2026-12-15",
    valuePerPoint: 0.015,
    notes: "Saldo principal",
  },
  {
    id: "sample-livelo",
    program: "Livelo",
    type: "pontos",
    balance: 12000,
    expiration: "2026-10-28",
    valuePerPoint: 0.012,
    notes: "Transferência e cashback",
  },
];

function normalizeRow(row: TravelLoyaltyProgramRow): LoyaltyProgram {
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

function readLocalPrograms(storageKey: string): LoyaltyProgram[] {
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return defaultPrograms;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return defaultPrograms;
    return parsed as LoyaltyProgram[];
  } catch {
    return defaultPrograms;
  }
}

function writeLocalPrograms(storageKey: string, programs: LoyaltyProgram[]) {
  localStorage.setItem(storageKey, JSON.stringify(programs));
}

export function PontosMilhasModule({ userEmail }: { userEmail?: string }) {
  const storageKey = useMemo(
    () => `axion:viagens:pontos-milhas:${userEmail ?? "guest"}`,
    [userEmail],
  );

  const [programs, setPrograms] = useState<LoyaltyProgram[]>(defaultPrograms);
  const [program, setProgram] = useState(PROGRAM_OPTIONS[0]);
  const [programType, setProgramType] = useState<ProgramType>("milhas");
  const [balance, setBalance] = useState("35000");
  const [expiration, setExpiration] = useState("2026-12-15");
  const [valuePerPoint, setValuePerPoint] = useState("0,015");
  const [notes, setNotes] = useState("");
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    if (!userEmail) {
      setPrograms(readLocalPrograms(storageKey));
      return;
    }

    const loadFromSupabase = async () => {
      try {
        const { data: userData, error: userError } = await supabase.auth.getUser();
        if (userError || !userData.user?.id) {
          setPrograms(readLocalPrograms(storageKey));
          return;
        }

        const { data, error } = await supabase
          .from("travel_loyalty_programs")
          .select("*")
          .eq("user_id", userData.user.id)
          .order("created_at", { ascending: false });

        if (error) throw error;

        const nextPrograms = data && data.length > 0 ? data.map(normalizeRow) : readLocalPrograms(storageKey);
        setPrograms(nextPrograms);
        writeLocalPrograms(storageKey, nextPrograms);
      } catch {
        setPrograms(readLocalPrograms(storageKey));
      }
    };

    void loadFromSupabase();
  }, [storageKey, userEmail]);

  useEffect(() => {
    if (!userEmail) {
      writeLocalPrograms(storageKey, programs);
    }
  }, [programs, storageKey, userEmail]);

  const totalBalance = programs.reduce((sum, item) => sum + item.balance, 0);
  const estimatedValue = programs.reduce((sum, item) => sum + item.balance * item.valuePerPoint, 0);
  const expiringSoon = programs.filter((item) => isExpiringSoon(item.expiration));

  const persistProgram = async (nextItem: LoyaltyProgram) => {
    if (!userEmail) return;

    try {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData.user?.id) return;

      const payload = {
        user_id: userData.user.id,
        program_name: nextItem.program,
        program_type: nextItem.type,
        balance: nextItem.balance,
        expiration_date: nextItem.expiration || null,
        value_per_point: nextItem.valuePerPoint,
        notes: nextItem.notes,
      };

      const { error } = await supabase.from("travel_loyalty_programs").insert(payload);
      if (!error) {
        const { data: rows, error: selectError } = await supabase
          .from("travel_loyalty_programs")
          .select("*")
          .eq("user_id", userData.user.id)
          .order("created_at", { ascending: false });

        if (!selectError && rows) {
          const synced = rows.map(normalizeRow);
          setPrograms(synced);
          writeLocalPrograms(storageKey, synced);
        }
      }
    } catch {
      // Intentionally ignore backend sync failures and keep the local state as source of truth.
    }
  };

  const removeProgramFromSupabase = async (id: string) => {
    if (!userEmail) return;

    try {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData.user?.id) return;

      const { error } = await supabase
        .from("travel_loyalty_programs")
        .delete()
        .eq("id", id)
        .eq("user_id", userData.user.id);

      if (!error) {
        const { data: rows, error: selectError } = await supabase
          .from("travel_loyalty_programs")
          .select("*")
          .eq("user_id", userData.user.id)
          .order("created_at", { ascending: false });

        if (!selectError && rows) {
          const synced = rows.map(normalizeRow);
          setPrograms(synced);
          writeLocalPrograms(storageKey, synced);
        }
      }
    } catch {
      // Intentionally ignore backend sync failures and keep the local state as source of truth.
    }
  };

  const addProgram = async () => {
    const balanceValue = parseNumber(balance);
    const pointValue = parseNumber(valuePerPoint);

    if (!program.trim() || balanceValue <= 0) return;

    const nextItem: LoyaltyProgram = {
      id: crypto.randomUUID(),
      program,
      type: programType,
      balance: balanceValue,
      expiration,
      valuePerPoint: pointValue || 0.01,
      notes: notes.trim(),
    };

    const nextPrograms = [nextItem, ...programs];
    setPrograms(nextPrograms);
    writeLocalPrograms(storageKey, nextPrograms);
    setProgram(PROGRAM_OPTIONS[0]);
    setProgramType("milhas");
    setBalance("");
    setExpiration("");
    setValuePerPoint("0,015");
    setNotes("");
    setSyncing(true);
    await persistProgram(nextItem);
    setSyncing(false);
  };

  const removeProgram = async (id: string) => {
    const nextPrograms = programs.filter((item) => item.id !== id);
    setPrograms(nextPrograms);
    writeLocalPrograms(storageKey, nextPrograms);
    setSyncing(true);
    await removeProgramFromSupabase(id);
    setSyncing(false);
  };

  const [cashValue, setCashValue] = useState("1500");
  const [neededMiles, setNeededMiles] = useState("25000");
  const [comparisonValue, setComparisonValue] = useState("0,015");

  const comparison = useMemo(() => {
    const cash = parseNumber(cashValue);
    const miles = parseNumber(neededMiles);
    const pointValue = parseNumber(comparisonValue);

    if (!cash || !miles || !pointValue) {
      return {
        totalInMiles: 0,
        economicGain: 0,
        recommended: "Preencha todos os campos",
      };
    }

    const totalInMiles = miles * pointValue;
    const economicGain = cash - totalInMiles;
    const recommended = economicGain > 0 ? "Usar milhas" : "Pagar em dinheiro";

    return {
      totalInMiles,
      economicGain,
      recommended,
    };
  }, [cashValue, comparisonValue, neededMiles]);

  return (
    <section className="mt-8 rounded-2xl border bg-card p-5">
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Submódulo
          </p>
          <h2 className="text-2xl font-bold">Pontos e milhas</h2>
        </div>
        <span className="rounded-full border bg-accent/30 px-3 py-1 text-xs font-medium text-muted-foreground">
          Gestão centralizada
        </span>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border bg-background p-4">
          <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">Saldo total</p>
          <p className="mt-3 text-3xl font-bold">{totalBalance.toLocaleString("pt-BR")}</p>
          <p className="mt-1 text-xs text-muted-foreground">pontos/milhas cadastrados</p>
        </div>
        <div className="rounded-2xl border bg-background p-4">
          <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">Valor estimado</p>
          <p className="mt-3 text-3xl font-bold">{formatCurrency(estimatedValue)}</p>
          <p className="mt-1 text-xs text-muted-foreground">baseado no valor por ponto</p>
        </div>
        <div className="rounded-2xl border bg-background p-4">
          <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">Expiração</p>
          <p className="mt-3 text-3xl font-bold">{expiringSoon.length}</p>
          <p className="mt-1 text-xs text-muted-foreground">próximos de vencer</p>
        </div>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-2xl border bg-background p-4">
          <h3 className="text-lg font-semibold">Cadastrar programa</h3>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2">
              <Label>Programa</Label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                value={program}
                onChange={(event) => setProgram(event.target.value)}
              >
                {PROGRAM_OPTIONS.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label>Tipo</Label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                value={programType}
                onChange={(event) => setProgramType(event.target.value as ProgramType)}
              >
                <option value="milhas">Milhas</option>
                <option value="pontos">Pontos</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label>Saldo</Label>
              <Input
                type="number"
                min="0"
                inputMode="numeric"
                value={balance}
                onChange={(event) => setBalance(event.target.value)}
                placeholder="Ex.: 35000"
              />
            </div>

            <div className="space-y-2">
              <Label>Validade</Label>
              <Input
                type="date"
                value={expiration}
                onChange={(event) => setExpiration(event.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Valor por ponto (R$)</Label>
              <Input
                type="text"
                inputMode="decimal"
                value={valuePerPoint}
                onChange={(event) => setValuePerPoint(event.target.value)}
                placeholder="0,015"
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label>Observações</Label>
              <Input
                type="text"
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="Ex.: saldo principal, pontos do cartão, cartela de família"
              />
            </div>
          </div>

          <div className="mt-4 flex justify-end gap-2">
            <Button type="button" onClick={() => void addProgram()} disabled={syncing}>
              {syncing ? "Salvando..." : "Adicionar programa"}
            </Button>
          </div>
        </div>

        <div className="rounded-2xl border bg-background p-4">
          <h3 className="text-lg font-semibold">Alertas</h3>
          {expiringSoon.length === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">
              Nenhum saldo próximo da expiração.
            </p>
          ) : (
            <ul className="mt-4 space-y-3 text-sm">
              {expiringSoon.map((item) => (
                <li key={item.id} className="rounded-xl border border-amber-400/40 bg-amber-500/5 p-3">
                  <p className="font-medium">{item.program}</p>
                  <p className="text-muted-foreground">
                    {item.balance.toLocaleString("pt-BR")} {item.type} · vence em {formatDate(item.expiration)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="mt-8 rounded-2xl border bg-background p-4">
        <h3 className="text-lg font-semibold">Minha carteira</h3>
        <div className="mt-4 overflow-hidden rounded-xl border">
          <div className="grid grid-cols-[1.2fr_0.8fr_0.9fr_0.7fr_0.5fr] bg-muted/40 px-3 py-2 text-xs font-semibold uppercase tracking-[0.1em] text-muted-foreground">
            <span>Programa</span>
            <span>Tipo</span>
            <span>Saldo</span>
            <span>Validade</span>
            <span>Ação</span>
          </div>
          {programs.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">Nenhum programa cadastrado.</p>
          ) : (
            programs.map((item) => (
              <div
                key={item.id}
                className="grid grid-cols-[1.2fr_0.8fr_0.9fr_0.7fr_0.5fr] items-center gap-2 border-t px-3 py-3 text-sm"
              >
                <div>
                  <p className="font-medium">{item.program}</p>
                  {item.notes && <p className="text-xs text-muted-foreground">{item.notes}</p>}
                </div>
                <span className="capitalize text-muted-foreground">{item.type}</span>
                <span>{item.balance.toLocaleString("pt-BR")}</span>
                <span className={isExpiringSoon(item.expiration) ? "text-amber-600" : "text-muted-foreground"}>
                  {formatDate(item.expiration)}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => void removeProgram(item.id)}
                  disabled={syncing}
                >
                  Excluir
                </Button>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="mt-8 rounded-2xl border bg-background p-4">
        <h3 className="text-lg font-semibold">Comparador de emissão</h3>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <Label>Preço em dinheiro</Label>
            <Input
              type="text"
              inputMode="decimal"
              value={cashValue}
              onChange={(event) => setCashValue(event.target.value)}
              placeholder="1500"
            />
          </div>
          <div className="space-y-2">
            <Label>Milhas necessárias</Label>
            <Input
              type="text"
              inputMode="numeric"
              value={neededMiles}
              onChange={(event) => setNeededMiles(event.target.value)}
              placeholder="25000"
            />
          </div>
          <div className="space-y-2">
            <Label>Valor da milha (R$)</Label>
            <Input
              type="text"
              inputMode="decimal"
              value={comparisonValue}
              onChange={(event) => setComparisonValue(event.target.value)}
              placeholder="0,015"
            />
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <div className="rounded-xl border bg-muted/30 p-4">
            <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">Custo em milhas</p>
            <p className="mt-2 text-2xl font-bold">{formatCurrency(comparison.totalInMiles)}</p>
          </div>
          <div className="rounded-xl border bg-muted/30 p-4">
            <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">Diferença</p>
            <p className="mt-2 text-2xl font-bold">{formatCurrency(comparison.economicGain)}</p>
          </div>
          <div className="rounded-xl border bg-muted/30 p-4">
            <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">Recomendação</p>
            <p className="mt-2 text-lg font-bold">{comparison.recommended}</p>
          </div>
        </div>
      </div>
    </section>
  );
}

export default PontosMilhasModule;
