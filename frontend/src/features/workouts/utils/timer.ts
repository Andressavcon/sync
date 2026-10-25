import { isTimed, type TimerStep } from "./timerSteps";

/**
 * Timer state machine (pure function, no React).
 * Time is computed from the END time of each step, not by counting seconds, so it stays
 * right with the screen locked or the app in the background (section 7.4).
 */
export interface TimerState {
  index: number;
  /** Epoch ms when the current timed step ends; null on manual steps or while paused */
  endsAt: number | null;
  /** Time left when paused */
  pausedMs: number | null;
  finished: boolean;
}

export type TimerAction =
  | { type: "tick"; now: number }
  | { type: "pause"; now: number }
  | { type: "resume"; now: number }
  | { type: "complete"; now: number } // finish a set / distance by hand
  | { type: "skip"; now: number }
  | { type: "back"; now: number };

/** Starts step `index` at `startAt` (with `remainingMs` when resuming a saved step). */
function enter(steps: TimerStep[], index: number, startAt: number, remainingMs?: number | null) {
  if (index >= steps.length) {
    return { index: steps.length - 1, endsAt: null, pausedMs: null, finished: true };
  }
  const step = steps[index];
  const duration = remainingMs ?? (step.durationSec ?? 0) * 1000;
  return {
    index,
    endsAt: isTimed(step) ? startAt + duration : null,
    pausedMs: null,
    finished: false,
  };
}

export function initialTimerState(
  steps: TimerStep[],
  savedIndex: number,
  remainingMs: number | null,
  now: number
): TimerState {
  const index = Math.min(Math.max(savedIndex, 0), steps.length - 1);
  return enter(steps, index, now, remainingMs);
}

/** Milliseconds left on the current step; null on manual steps. */
export function remainingOf(state: TimerState, now: number): number | null {
  if (state.pausedMs != null) return state.pausedMs;
  if (state.endsAt == null) return null;
  return Math.max(0, state.endsAt - now);
}

export function reduceTimer(steps: TimerStep[], state: TimerState, action: TimerAction): TimerState {
  if (state.finished) return state;
  const current = steps[state.index];

  switch (action.type) {
    case "tick": {
      // Catch up: each step starts exactly when the previous one ended. After a long time in
      // the background this skips every timed step that would already be over, and stops at
      // the one still running or at a manual step (which waits for the user).
      let next = state;
      while (!next.finished && next.endsAt != null && next.endsAt <= action.now) {
        next = enter(steps, next.index + 1, next.endsAt);
      }
      return next;
    }
    case "pause":
      if (state.endsAt == null) return state;
      return { ...state, pausedMs: Math.max(0, state.endsAt - action.now), endsAt: null };
    case "resume":
      if (state.pausedMs == null) return state;
      return { ...state, endsAt: action.now + state.pausedMs, pausedMs: null };
    case "complete":
      return enter(steps, state.index + 1, action.now);
    case "skip": {
      // On a rest: go to what comes next. Otherwise skip the whole block step (all its sets)
      if (current.kind === "rest") return enter(steps, state.index + 1, action.now);
      const next = steps.findIndex((s) => s.stepIndex > current.stepIndex);
      return enter(steps, next === -1 ? steps.length : next, action.now);
    }
    case "back": {
      let index = state.index - 1;
      while (index >= 0 && steps[index].kind === "rest") index--;
      return enter(steps, Math.max(index, 0), action.now);
    }
  }
}
