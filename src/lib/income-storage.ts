export type IncomeCadence = "monthly" | "annual" | "once";

export type IncomeSource = {
  id: string;
  title: string;
  category: string;
  expected_cents: number;
  due_day: number;
  first_month: string;
  last_month: string | null;
  cadence: IncomeCadence;
  account_name: string;
  notes: string;
  created_at: string;
  received_cents?: number;
};

export const INCOME_STORAGE_KEY = "casa_clara_income_sources_v1";

export function getDefaultIncomeSources(): IncomeSource[] {
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  return [
    {
      id: "income-sample-1",
      title: "Salário principal",
      category: "Salário",
      expected_cents: 420000,
      due_day: 5,
      first_month: currentMonth,
      last_month: null,
      cadence: "monthly",
      account_name: "Conta principal",
      notes: "Receita mensal fixa",
      created_at: new Date().toISOString(),
      received_cents: 350000,
    },
    {
      id: "income-sample-2",
      title: "Aluguel",
      category: "Renda extra",
      expected_cents: 180000,
      due_day: 10,
      first_month: currentMonth,
      last_month: null,
      cadence: "monthly",
      account_name: "Conta renda",
      notes: "Receita recorrente",
      created_at: new Date().toISOString(),
      received_cents: 0,
    },
  ];
}

export function readIncomeSources(): IncomeSource[] {
  if (typeof window === "undefined") return getDefaultIncomeSources();
  try {
    const raw = window.localStorage.getItem(INCOME_STORAGE_KEY);
    if (!raw) return getDefaultIncomeSources();
    const parsed = JSON.parse(raw) as IncomeSource[];
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : getDefaultIncomeSources();
  } catch {
    return getDefaultIncomeSources();
  }
}

export function writeIncomeSources(data: IncomeSource[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(INCOME_STORAGE_KEY, JSON.stringify(data));
}

export function addIncomeSource(source: Omit<IncomeSource, "id" | "created_at"> & { id?: string }) {
  const existing = readIncomeSources();
  const next: IncomeSource = {
    ...source,
    id: source.id ?? crypto.randomUUID(),
    created_at: new Date().toISOString(),
  };
  writeIncomeSources([...existing, next]);
  return next;
}
