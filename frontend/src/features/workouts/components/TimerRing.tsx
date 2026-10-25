import { clock } from "../utils/format";

interface Props {
  remainingMs: number;
  totalMs: number;
  label: string;
  paused?: boolean;
}

const RADIUS = 96;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export default function TimerRing({ remainingMs, totalMs, label, paused }: Props) {
  const fraction = totalMs > 0 ? Math.min(1, remainingMs / totalMs) : 0;

  return (
    <div className="relative h-56 w-56">
      <svg viewBox="0 0 220 220" className="h-full w-full -rotate-90" aria-hidden="true">
        <circle cx="110" cy="110" r={RADIUS} fill="none" strokeWidth="10" className="stroke-border" />
        <circle
          cx="110"
          cy="110"
          r={RADIUS}
          fill="none"
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={CIRCUMFERENCE * (1 - fraction)}
          className="stroke-primary transition-[stroke-dashoffset] duration-300 ease-linear"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-5xl font-semibold tabular-nums">{clock(remainingMs)}</span>
        <span className="mt-1 text-xs uppercase tracking-wide text-muted">
          {paused ? "Pausado" : label}
        </span>
      </div>
    </div>
  );
}
