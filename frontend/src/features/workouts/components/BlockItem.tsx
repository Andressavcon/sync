import { useState } from "react";
import { ChevronDown, ChevronUp, Play, Trash2 } from "lucide-react";
import Button from "@/components/ui/Button";
import Checkbox from "@/components/ui/Checkbox";
import type { Block } from "@/data/repositories/workoutsRepository";
import { describeStep } from "../utils/format";
import { buildTimerSteps } from "../utils/timerSteps";

interface Props {
  block: Block;
  readOnly: boolean;
  onStart: () => void;
  onToggleDone: (done: boolean) => void;
  onRemove: () => void;
}

export default function BlockItem({ block, readOnly, onStart, onToggleDone, onRemove }: Props) {
  const [open, setOpen] = useState(false);
  const done = block.state === "done";
  const inProgress = block.state === "in_progress";
  const currentStep = (buildTimerSteps(block.steps)[block.stepIndex]?.stepIndex ?? 0) + 1;

  return (
    <li className="rounded-lg border border-border bg-bg p-3">
      <div className="flex flex-wrap items-center gap-3">
        <Checkbox
          label={`Marcar ${block.title} como concluído`}
          checked={done}
          disabled={readOnly}
          onChange={onToggleDone}
        />
        <div className="min-w-0 flex-1 basis-40">
          <p className={done ? "text-muted line-through" : "font-medium"}>{block.title}</p>
          <p className="text-xs text-muted">
            {block.steps.length} etapas
            {inProgress && ` · parou na etapa ${currentStep}`}
          </p>
        </div>

        {!done && !readOnly && (
          <Button onClick={onStart} disabled={block.steps.length === 0}>
            <Play size={14} /> {inProgress ? "Continuar" : "Iniciar"}
          </Button>
        )}
        <Button
          variant="ghost"
          size="icon"
          aria-label={open ? "Esconder etapas" : "Ver etapas"}
          onClick={() => setOpen(!open)}
        >
          {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </Button>
        {!readOnly && (
          <Button variant="ghost" size="icon" aria-label="Remover do dia" onClick={onRemove}>
            <Trash2 size={16} />
          </Button>
        )}
      </div>

      {open && (
        <ol className="mt-3 flex flex-col gap-1 border-t border-border pt-3 text-sm text-muted">
          {block.steps.length === 0 && <li>Este bloco não tem etapas.</li>}
          {block.steps.map((step, index) => (
            <li key={index}>
              {index + 1}. {describeStep(step)}
            </li>
          ))}
        </ol>
      )}
    </li>
  );
}
