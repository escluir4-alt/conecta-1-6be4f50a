/** Avaliador aritmético sem eval/Function: operações básicas, parênteses e porcentagens. */
export function evaluate(src: string): number {
  const s = src.replace(/×/g, "*").replace(/÷/g, "/").replace(/,/g, ".").replace(/\s+/g, "");
  let i = 0;
  const peek = () => s[i];
  function number(): number {
    const m = /^\d*\.?\d+(e[+-]?\d+)?/i.exec(s.slice(i));
    if (!m) throw new Error("Expressão inválida");
    i += m[0].length;
    return Number(m[0]);
  }
  function atom(): number {
    if (peek() === "-") { i++; return -atom(); }
    if (peek() === "+") { i++; return atom(); }
    let v: number;
    if (peek() === "(") { i++; v = add(); if (peek() !== ")") throw new Error("Falta fechar parêntese"); i++; }
    else v = number();
    while (peek() === "%") { i++; v /= 100; }
    return v;
  }
  function mul(): number {
    let v = atom();
    while (peek() === "*" || peek() === "/") {
      const op = s[i++], rhs = atom();
      if (op === "/" && rhs === 0) throw new Error("Divisão por zero");
      v = op === "*" ? v * rhs : v / rhs;
    }
    return v;
  }
  function add(): number {
    let v = mul();
    while (peek() === "+" || peek() === "-") {
      const op = s[i++], rhs = mul();
      v = op === "+" ? v + rhs : v - rhs;
    }
    return v;
  }
  if (!s) throw new Error("Digite uma expressão");
  const result = add();
  if (i !== s.length || !Number.isFinite(result)) throw new Error("Expressão inválida");
  return Math.round(result * 1e10) / 1e10;
}
