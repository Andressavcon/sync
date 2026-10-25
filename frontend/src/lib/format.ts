export function formatBRL(valor: number): string {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function parseBRL(texto: string): number {
  const t = texto.trim().replace(/[^\d.,]/g, "");
  if (!t) return NaN;
  const normal = t.includes(",") ? t.replace(/\./g, "").replace(",", ".") : t;
  const n = Number(normal);
  return Number.isFinite(n) ? n : NaN;
}

/** "segunda-feira" -> "Segunda-feira" (CSS `capitalize` would make "Segunda-Feira") */
export function capitalizeFirst(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}
