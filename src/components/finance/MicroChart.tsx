// Micrográficos baseados em dados reais (proporções), sem valores inventados.
export function MicroBar({ value, tone = "gold" }: { value: number; tone?: "gold" | "sage" | "light" }) {
  const pct = Math.max(0, Math.min(100, Number.isFinite(value) ? value : 0));
  const fill = tone === "light" ? "bg-gold" : tone === "sage" ? "bg-sage" : "bg-primary";
  return <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-current/10" aria-hidden="true">
    <div className={`h-full rounded-full ${fill} transition-[width] duration-700`} style={{ width: `${pct}%` }} />
  </div>;
}

export function MicroRing({ value, size = 44 }: { value: number; size?: number }) {
  const pct = Math.max(0, Math.min(100, Number.isFinite(value) ? value : 0));
  const r = 16, c = 2 * Math.PI * r;
  return <svg viewBox="0 0 40 40" width={size} height={size} aria-hidden="true" className="shrink-0 -rotate-90">
    <circle cx="20" cy="20" r={r} fill="none" stroke="currentColor" strokeOpacity=".12" strokeWidth="4" />
    <circle cx="20" cy="20" r={r} fill="none" stroke="var(--gold)" strokeWidth="4" strokeLinecap="round"
      strokeDasharray={`${(pct / 100) * c} ${c}`} className="transition-[stroke-dasharray] duration-700" />
  </svg>;
}

export function MicroSpark({ values }: { values: number[] }) {
  if (values.length < 2) return null;
  const max = Math.max(...values, 1);
  return <div className="mt-4 flex h-8 items-end gap-[3px]" aria-hidden="true">
    {values.map((v, i) => <span key={i} className="flex-1 rounded-sm bg-primary/70" style={{ height: `${Math.max(6, (v / max) * 100)}%` }} />)}
  </div>;
}
