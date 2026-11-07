export function AxionMark({ className = "size-9" }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 44" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="axion-gold" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="var(--gold)" />
          <stop offset="100%" stopColor="oklch(0.6 0.1 70)" />
        </linearGradient>
      </defs>
      <path d="M2 42 L22 6 L32 24 L26 24 L22 16 L10 42 Z" fill="url(#axion-gold)" />
      <path d="M30 4 L40 4 L62 42 L52 42 Z" fill="url(#axion-gold)" />
      <path d="M62 4 L52 4 L30 42 L40 42 Z" fill="url(#axion-gold)" opacity="0.85" />
    </svg>
  );
}

export function Logo({ size = "md", tone = "default" }: { size?: "md" | "lg"; tone?: "default" | "light" }) {
  const light = tone === "light";
  return (
    <div className="flex items-center gap-3">
      <AxionMark className={size === "lg" ? "h-10 w-14" : "h-8 w-11"} />
      <div className={`border-l pl-3 leading-tight ${light ? "border-gold/50" : "border-border"}`}>
        <div className={`${size === "lg" ? "text-3xl" : "text-xl"} font-semibold tracking-[0.25em] ${light ? "text-hero-foreground" : "text-foreground"}`}>
          AXION
        </div>
        <div className={`text-xs ${light ? "text-hero-foreground/80" : "text-muted-foreground"}`}>Gestão pessoal e financeira</div>
      </div>
    </div>
  );
}
