export const brl = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

export function Change({ value }: { value: number }) {
  const cls = value > 0 ? "text-success" : value < 0 ? "text-destructive" : "text-muted-foreground";
  return <span className={`text-sm font-semibold ${cls}`}>{value > 0 ? "▲ " : value < 0 ? "▼ " : ""}{Math.abs(value).toFixed(2).replace(".", ",")}%</span>;
}
