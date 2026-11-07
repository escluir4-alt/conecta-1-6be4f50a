export const FREE_MODEL = "gemini-3.5-flash-lite";

export function internalIntent(question: string) {
  const q = question.toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "");
  if (/\b(agenda|compromissos?|eventos?)\b/.test(q)) return "agenda";
  if (/\b(receitas?|receber|recebimentos?)\b/.test(q)) return "revenue";
  if (/\b(semana|proximos sete dias|proximos 7 dias)\b/.test(q) && /venc|conta|pag/.test(q)) return "weekly";
  if (/\b(pagar|despesas?|pendencias?|contas?|mes)\b/.test(q)) return "bills";
  return null;
}
export const brl = (cents: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);
export function dateOffset(date: string, days: number) {
  return new Date(Date.parse(date) + days * 86400000).toISOString().slice(0, 10);
}

export function geminiPayload(question: string, tone: string, deep: boolean) {
  return {
    systemInstruction: { parts: [{ text: `Você é a Axion, assistente generalista. Responda em pt-BR salvo pedido contrário, com tom ${tone}. ${deep ? "Compare alternativas, riscos e incertezas." : "Seja direta."} Não afirme acesso ao Conecta ou execução de ações.` }] },
    contents: [{ role: "user", parts: [{ text: question }] }],
    generationConfig: { maxOutputTokens: deep ? 1600 : 750 },
  };
}
