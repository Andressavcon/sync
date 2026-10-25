import type { Etapa } from "../types";

/** 125 -> "2 min 5 s" */
export function formatarSegundos(total: number): string {
  const m = Math.floor(total / 60);
  const s = total % 60;
  if (m === 0) return `${s} s`;
  return s > 0 ? `${m} min ${s} s` : `${m} min`;
}

/** 83000 ms -> "01:23" */
export function relogio(ms: number): string {
  const t = Math.ceil(ms / 1000);
  const m = Math.floor(t / 60);
  const s = t % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function descreverEtapa(e: Etapa): string {
  if (e.tipo === "tempo") {
    const descanso = e.descansoSeg > 0 ? ` (descanso ${formatarSegundos(e.descansoSeg)})` : "";
    return `${e.nome} — ${formatarSegundos(e.duracaoSeg)}${descanso}`;
  }
  if (e.tipo === "repeticoes") {
    const descanso = e.descansoSeg > 0 ? ` (descanso ${formatarSegundos(e.descansoSeg)})` : "";
    return `${e.nome} — ${e.series}×${e.reps}${descanso}`;
  }
  return `${e.nome} — ${String(e.km).replace(".", ",")} km`;
}
