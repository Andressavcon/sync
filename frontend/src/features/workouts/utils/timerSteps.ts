import type { Step } from "@/data/repositories/workoutsRepository";

export type TimerStepKind = "time" | "set" | "distance" | "rest";

/**
 * The block becomes a queue of timer steps. "time" and "rest" run by themselves;
 * "set" and "distance" wait for the user to finish them.
 */
export interface TimerStep {
  kind: TimerStepKind;
  /** Index of the block step it belongs to */
  stepIndex: number;
  name: string;
  durationSec?: number; // time and rest
  set?: number;
  totalSets?: number;
  reps?: number;
  km?: number;
}

export function buildTimerSteps(steps: Step[]): TimerStep[] {
  const queue: TimerStep[] = [];
  const last = steps.length - 1;

  steps.forEach((step, stepIndex) => {
    if (step.type === "time") {
      queue.push({ kind: "time", stepIndex, name: step.name, durationSec: step.durationSec });
      if (step.restSec > 0 && stepIndex < last) {
        queue.push({ kind: "rest", stepIndex, name: "Descanso", durationSec: step.restSec });
      }
    } else if (step.type === "reps") {
      for (let set = 1; set <= step.sets; set++) {
        queue.push({
          kind: "set",
          stepIndex,
          name: step.name,
          set,
          totalSets: step.sets,
          reps: step.reps,
        });
        const hasNext = set < step.sets || stepIndex < last;
        if (step.restSec > 0 && hasNext) {
          queue.push({ kind: "rest", stepIndex, name: "Descanso", durationSec: step.restSec });
        }
      }
    } else {
      queue.push({ kind: "distance", stepIndex, name: step.name, km: step.km });
    }
  });

  return queue;
}

export const isTimed = (step: TimerStep) => step.kind === "time" || step.kind === "rest";
