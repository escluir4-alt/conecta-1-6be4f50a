import { z } from "zod";

export const scopeSchema = z.enum(["general", "private", "web", "free", "internal"]);
export type Scope = z.infer<typeof scopeSchema>;
export const sourceSchema = z.object({ url: z.string().url().regex(/^https:\/\//i).max(1600), title: z.string().max(200) });
export const messageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  text: z.string().min(1).max(8000),
  scope: scopeSchema,
  usesMemory: z.boolean().optional(),
  sources: z.array(sourceSchema).max(12).optional(),
});
export type Message = z.infer<typeof messageSchema>;
export const branchSchema = z.array(messageSchema).max(40);
export const conversationSchema = z.object({
  id: z.string().uuid(),
  title: z.string().trim().min(1).max(120),
  archived: z.boolean(),
  revision: z.number().int().min(0).nullable(),
  branches: z.array(branchSchema).min(1).max(12),
});
export type Conversation = z.infer<typeof conversationSchema>;
export const preferencesSchema = z.object({
  tone: z.enum(["direto", "detalhado"]).default("direto"),
  deep: z.boolean().default(false),
  memory: z.string().max(2000).default(""),
});
export const askSchema = z.object({
  question: z.string().trim().min(1).max(4000),
  history: branchSchema.default([]),
  scope: scopeSchema,
  tone: z.enum(["direto", "detalhado"]),
  deep: z.boolean(),
  includeMemory: z.boolean().default(false),
  image: z.string().max(1_400_050).regex(/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$/).optional(),
}).refine((v) => !["web", "free", "internal"].includes(v.scope) || (!v.image && !v.includeMemory), "Este modo não aceita imagens ou memória.");
export function modelHistory(history: Message[], scope: Scope, includeMemory = false) {
  return scope === "web" ? [] : history.filter(m => m.scope === scope && (includeMemory || !m.usesMemory)).slice(-6)
    .map(m => ({ role: m.role, content: m.text.slice(0, 1800) }));
}
export function periodBounds(date: Date, timeZone = "America/Sao_Paulo") {
  const parts = new Intl.DateTimeFormat("pt-BR", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(date);
  const part = (type: string) => parts.find(p => p.type === type)?.value ?? "";
  const year = Number(part("year")), month = Number(part("month"));
  const start = `${year}-${part("month")}-01`;
  const end = `${month === 12 ? year + 1 : year}-${String(month % 12 + 1).padStart(2, "0")}-01`;
  return { start, end, today: `${year}-${part("month")}-${part("day")}` };
}
export function outstanding(rows: { expected_cents: number; paid_cents: number | null }[]) {
  return rows.reduce((sum, r) => sum + Math.max(0, r.expected_cents - (r.paid_cents ?? 0)), 0);
}
