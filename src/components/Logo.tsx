import { Home } from "lucide-react";

export function Logo({ size = "md" }: { size?: "md" | "lg" }) {
  return (
    <div className="flex items-center gap-3">
      <Home className={size === "lg" ? "size-10 text-primary" : "size-8 text-primary"} strokeWidth={1.8} />
      <div className="leading-tight">
        <div className={size === "lg" ? "text-3xl font-extrabold font-display" : "text-xl font-extrabold font-display"}>
          Casa <span className="text-primary">Clara</span>
        </div>
        <div className="text-xs text-muted-foreground">Gestão pessoal e financeira</div>
      </div>
    </div>
  );
}
