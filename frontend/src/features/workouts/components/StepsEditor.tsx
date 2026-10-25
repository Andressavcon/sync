import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import type { Step, StepType } from "@/data/repositories/workoutsRepository";
import { fieldClass } from "@/lib/ui";
import { STEP_TYPE_LABELS, formatSeconds, isStepValid, newStep } from "../utils/format";

function NumberField({
  label,
  value,
  onChange,
  min = 0,
  step = 1,
  hint,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  step?: number;
  hint?: string;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs text-muted">{label}</span>
      <Input
        type="number"
        inputMode="decimal"
        min={min}
        step={step}
        value={Number.isFinite(value) ? value : ""}
        onChange={(e) => onChange(e.target.value === "" ? NaN : Number(e.target.value))}
      />
      {hint && <span className="text-xs text-muted">{hint}</span>}
    </label>
  );
}

interface Props {
  steps: Step[];
  onChange: (steps: Step[]) => void;
}

/** List of steps of the three kinds, which can be mixed (section 7.3). */
export default function StepsEditor({ steps, onChange }: Props) {
  const replace = (index: number, step: Step) =>
    onChange(steps.map((s, i) => (i === index ? step : s)));

  function move(index: number, offset: -1 | 1) {
    const target = index + offset;
    if (target < 0 || target >= steps.length) return;
    const next = [...steps];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  }

  return (
    <div className="flex flex-col gap-3">
      {steps.length === 0 && (
        <p className="rounded-xl border border-dashed border-border py-6 text-center text-sm text-muted">
          Nenhuma etapa ainda.
        </p>
      )}

      {steps.map((step, index) => (
        <div
          key={index}
          className={[
            "flex flex-col gap-3 rounded-xl border bg-inset p-3",
            isStepValid(step) ? "border-border" : "border-red-400/60",
          ].join(" ")}
        >
          <div className="flex flex-wrap items-center gap-2">
            <span className="w-6 text-sm text-muted">{index + 1}.</span>
            <select
              className={`${fieldClass} w-auto`}
              aria-label="Tipo da etapa"
              value={step.type}
              onChange={(e) => replace(index, newStep(e.target.value as StepType, step.name))}
            >
              {Object.entries(STEP_TYPE_LABELS).map(([type, label]) => (
                <option key={type} value={type}>
                  {label}
                </option>
              ))}
            </select>
            <div className="ml-auto flex">
              <Button variant="ghost" size="icon" aria-label="Subir etapa" disabled={index === 0} onClick={() => move(index, -1)}>
                <ArrowUp size={16} />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Descer etapa"
                disabled={index === steps.length - 1}
                onClick={() => move(index, 1)}
              >
                <ArrowDown size={16} />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Remover etapa"
                onClick={() => onChange(steps.filter((_, i) => i !== index))}
              >
                <Trash2 size={16} />
              </Button>
            </div>
          </div>

          <Input
            placeholder="Nome do exercício"
            aria-label="Nome do exercício"
            value={step.name}
            onChange={(e) => replace(index, { ...step, name: e.target.value })}
          />

          {step.type === "time" && (
            <div className="grid grid-cols-2 gap-3">
              <NumberField
                label="Duração (segundos)"
                min={1}
                value={step.durationSec}
                onChange={(durationSec) => replace(index, { ...step, durationSec })}
                hint={step.durationSec > 0 ? formatSeconds(step.durationSec) : undefined}
              />
              <NumberField
                label="Descanso depois (segundos)"
                value={step.restSec}
                onChange={(restSec) => replace(index, { ...step, restSec })}
              />
            </div>
          )}

          {step.type === "reps" && (
            <div className="grid grid-cols-3 gap-3">
              <NumberField label="Séries" min={1} value={step.sets} onChange={(sets) => replace(index, { ...step, sets })} />
              <NumberField label="Repetições" min={1} value={step.reps} onChange={(reps) => replace(index, { ...step, reps })} />
              <NumberField
                label="Descanso entre séries (s)"
                value={step.restSec}
                onChange={(restSec) => replace(index, { ...step, restSec })}
              />
            </div>
          )}

          {step.type === "distance" && (
            <div className="grid grid-cols-2 gap-3">
              <NumberField
                label="Distância (km)"
                min={0.1}
                step={0.1}
                value={step.km}
                onChange={(km) => replace(index, { ...step, km })}
              />
            </div>
          )}
        </div>
      ))}

      <Button variant="secondary" onClick={() => onChange([...steps, newStep("time")])}>
        <Plus size={16} /> Adicionar etapa
      </Button>
    </div>
  );
}
