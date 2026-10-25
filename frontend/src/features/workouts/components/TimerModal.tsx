import { useEffect, useReducer, useRef } from "react";
import { Check, Pause, Play, SkipBack, SkipForward, X } from "lucide-react";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import type { Block, BlockProgress } from "@/data/repositories/workoutsRepository";
import { useNow } from "@/hooks/useNow";
import { useWakeLock } from "@/hooks/useWakeLock";
import { beep } from "@/lib/beep";
import { formatKm } from "../utils/format";
import {
  initialTimerState,
  reduceTimer,
  remainingOf,
  type TimerAction,
  type TimerState,
} from "../utils/timer";
import { buildTimerSteps, isTimed, type TimerStep } from "../utils/timerSteps";
import TimerRing from "./TimerRing";

const TICK_MS = 250;
const CLOSE_AFTER_FINISH_MS = 2800;

interface Props {
  block: Block;
  /** Saves where the timer is (the page sends it to the API or the offline queue) */
  onProgress: (progress: BlockProgress) => void;
  /** Last step finished: the block is done */
  onFinish: () => void;
  onClose: () => void;
}

function Timer({ block, steps, onProgress, onFinish, onClose }: Props & { steps: TimerStep[] }) {
  const [state, dispatch] = useReducer(
    (current: TimerState, action: TimerAction) => reduceTimer(steps, current, action),
    undefined,
    () => initialTimerState(steps, block.stepIndex, block.remainingMs, Date.now())
  );
  const now = useNow(TICK_MS).getTime();

  // Keep the latest callbacks without restarting the effects below
  const callbacks = useRef({ onProgress, onFinish, onClose });
  useEffect(() => {
    callbacks.current = { onProgress, onFinish, onClose };
  });

  useWakeLock(true); // keeps the screen on during the workout

  // Advances by itself when a timed step or rest is over
  useEffect(() => {
    const id = setInterval(() => dispatch({ type: "tick", now: Date.now() }), TICK_MS);
    return () => clearInterval(id);
  }, []);

  // Each new step: save the position (no time left saved: the step restarts if the app dies)
  useEffect(() => {
    if (!state.finished) callbacks.current.onProgress({ stepIndex: state.index, remainingMs: null });
  }, [state.index, state.finished]);

  // Sound at every step change
  const previousIndex = useRef(state.index);
  useEffect(() => {
    if (previousIndex.current !== state.index) {
      beep();
      previousIndex.current = state.index;
    }
  }, [state.index]);

  // Last step done: mark the block, show the congratulations and close
  useEffect(() => {
    if (!state.finished) return;
    callbacks.current.onFinish();
    beep(660, 500);
    const id = setTimeout(() => callbacks.current.onClose(), CLOSE_AFTER_FINISH_MS);
    return () => clearTimeout(id);
  }, [state.finished]);

  /** Closing in the middle keeps the progress, including the time left */
  function close() {
    if (!state.finished) {
      const step = steps[state.index];
      onProgress({
        stepIndex: state.index,
        remainingMs: isTimed(step) ? remainingOf(state, Date.now()) : null,
      });
    }
    onClose();
  }

  const act = (type: TimerAction["type"]) => dispatch({ type, now: Date.now() });

  if (state.finished) {
    return (
      <Modal onClose={onClose}>
        <div className="flex flex-col items-center gap-3 p-10 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary text-bg">
            <Check size={36} strokeWidth={3} />
          </div>
          <h2 className="text-2xl font-semibold">Parabéns!</h2>
          <p className="text-muted">{block.title} concluído.</p>
        </div>
      </Modal>
    );
  }

  const step = steps[state.index];
  const timed = isTimed(step);
  const paused = state.pausedMs != null;
  const remaining = remainingOf(state, now);
  const next = steps.slice(state.index + 1).find((s) => s.kind !== "rest");
  const isSet = step.kind === "set";
  const isRest = step.kind === "rest";

  return (
    <Modal onClose={close}>
      <div className="flex flex-col items-center gap-5 p-6">
        <header className="flex w-full items-center justify-between gap-2">
          <span className="truncate text-sm text-muted">{block.title}</span>
          <Button variant="ghost" size="icon" aria-label="Fechar e guardar progresso" onClick={close}>
            <X size={20} />
          </Button>
        </header>

        <p className="text-sm text-muted">
          Etapa {step.stepIndex + 1} de {block.steps.length}
          {isSet && ` · série ${step.set}/${step.totalSets}`}
        </p>

        {timed ? (
          <TimerRing
            remainingMs={remaining ?? 0}
            totalMs={(step.durationSec ?? 0) * 1000}
            label={isRest ? "Descanso" : "Em andamento"}
            paused={paused}
          />
        ) : (
          <div className="flex h-56 w-56 flex-col items-center justify-center rounded-full border-10 border-border">
            <span className="text-5xl font-semibold">{isSet ? step.reps : formatKm(step.km ?? 0)}</span>
            <span className="mt-1 text-xs uppercase tracking-wide text-muted">
              {isSet ? "repetições" : "km"}
            </span>
          </div>
        )}

        <div className="text-center">
          <h2 className="text-2xl font-semibold">{step.name}</h2>
          {step.kind === "distance" && (
            <p className="mt-1 text-sm text-muted">Controle no relógio e toque em Concluir.</p>
          )}
        </div>

        <p className="text-sm text-muted">
          {next
            ? `Próxima: ${next.name}${next.kind === "set" ? ` · série ${next.set}/${next.totalSets}` : ""}`
            : "Esta é a última etapa."}
        </p>

        <div className="flex w-full flex-wrap items-center justify-center gap-3">
          <Button variant="secondary" onClick={() => act("back")}>
            <SkipBack size={16} /> Voltar
          </Button>

          {timed ? (
            <Button className="min-w-36" onClick={() => act(paused ? "resume" : "pause")}>
              {paused ? <Play size={16} /> : <Pause size={16} />} {paused ? "Retomar" : "Pausar"}
            </Button>
          ) : (
            <Button className="min-w-36" onClick={() => act("complete")}>
              <Check size={16} /> {isSet ? "Concluir série" : "Concluir"}
            </Button>
          )}

          <Button variant="secondary" onClick={() => act("skip")}>
            {isRest ? "Pular descanso" : "Pular etapa"} <SkipForward size={16} />
          </Button>
        </div>
      </div>
    </Modal>
  );
}

export default function TimerModal(props: Props) {
  const steps = buildTimerSteps(props.block.steps);
  if (steps.length === 0) {
    return (
      <Modal onClose={props.onClose}>
        <div className="flex flex-col items-center gap-4 p-8 text-center">
          <p>Este bloco não tem etapas.</p>
          <Button onClick={props.onClose}>Fechar</Button>
        </div>
      </Modal>
    );
  }
  return <Timer {...props} steps={steps} />;
}
