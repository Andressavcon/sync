import { relogio } from "../utils/formato";

interface Props {
  restanteMs: number;
  totalMs: number;
  rotulo: string;
  pausado?: boolean;
}

const RAIO = 96;
const CIRCUNFERENCIA = 2 * Math.PI * RAIO;

export default function AnelCronometro({ restanteMs, totalMs, rotulo, pausado }: Props) {
  const fracao = totalMs > 0 ? Math.min(1, restanteMs / totalMs) : 0;

  return (
    <div className="relative h-56 w-56">
      <svg viewBox="0 0 220 220" className="h-full w-full -rotate-90" aria-hidden="true">
        <circle cx="110" cy="110" r={RAIO} fill="none" strokeWidth="10" className="stroke-border" />
        <circle
          cx="110"
          cy="110"
          r={RAIO}
          fill="none"
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={CIRCUNFERENCIA}
          strokeDashoffset={CIRCUNFERENCIA * (1 - fracao)}
          className="stroke-primary transition-[stroke-dashoffset] duration-300 ease-linear"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-5xl font-semibold tabular-nums">{relogio(restanteMs)}</span>
        <span className="mt-1 text-xs uppercase tracking-wide text-muted">
          {pausado ? "Pausado" : rotulo}
        </span>
      </div>
    </div>
  );
}
