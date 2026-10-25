import type { Step, StepType } from "@/data/repositories/workoutsRepository";

/** 125 -> "2 min 5 s" */
export function formatSeconds(total: number): string {
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  if (minutes === 0) return `${seconds} s`;
  return seconds > 0 ? `${minutes} min ${seconds} s` : `${minutes} min`;
}

/** 83000 ms -> "01:23" */
export function clock(ms: number): string {
  const total = Math.ceil(ms / 1000);
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export const formatKm = (km: number) => String(km).replace(".", ",");

export function describeStep(step: Step): string {
  if (step.type === "time") {
    const rest = step.restSec > 0 ? ` (descanso ${formatSeconds(step.restSec)})` : "";
    return `${step.name} — ${formatSeconds(step.durationSec)}${rest}`;
  }
  if (step.type === "reps") {
    const rest = step.restSec > 0 ? ` (descanso ${formatSeconds(step.restSec)})` : "";
    return `${step.name} — ${step.sets}×${step.reps}${rest}`;
  }
  return `${step.name} — ${formatKm(step.km)} km`;
}

export const STEP_TYPE_LABELS: Record<StepType, string> = {
  time: "Por tempo",
  reps: "Por repetições",
  distance: "Por distância",
};

/** A new step of the chosen type, keeping the name already typed */
export function newStep(type: StepType, name = ""): Step {
  if (type === "time") return { type, name, durationSec: 30, restSec: 0 };
  if (type === "reps") return { type, name, sets: 3, reps: 10, restSec: 30 };
  return { type, name, km: 5 };
}

/** Same limits as the backend schemas */
export function isStepValid(step: Step): boolean {
  if (!step.name.trim()) return false;
  if (step.type === "time") {
    return step.durationSec >= 1 && step.durationSec <= 36000 && step.restSec >= 0 && step.restSec <= 3600;
  }
  if (step.type === "reps") {
    return step.sets >= 1 && step.sets <= 50 && step.reps >= 1 && step.reps <= 1000 && step.restSec >= 0;
  }
  return step.km > 0 && step.km <= 1000;
}
