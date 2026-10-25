import Input from "@/components/ui/Input";
import type { Frequency } from "@/data/repositories/kanbanRepository";
import { fieldClass } from "@/lib/ui";
import { FREQUENCY_OPTIONS, WEEKDAY_LABELS, type RepeatSettings } from "../types";

interface Props {
  value: RepeatSettings;
  onChange: (value: RepeatSettings) => void;
}

/** Frequency, weekdays / day of the month and optional end date (section 4.10). */
export default function RepeatFields({ value, onChange }: Props) {
  const set = (changes: Partial<RepeatSettings>) => onChange({ ...value, ...changes });

  const toggleWeekday = (day: number) =>
    set({
      weekdays: value.weekdays.includes(day)
        ? value.weekdays.filter((d) => d !== day)
        : [...value.weekdays, day].sort((a, b) => a - b),
    });

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border p-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium">Frequência</span>
          <select
            className={fieldClass}
            value={value.frequency}
            onChange={(e) => set({ frequency: e.target.value as Frequency })}
          >
            {FREQUENCY_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium">Até (opcional)</span>
          <Input type="date" value={value.endDate} onChange={(e) => set({ endDate: e.target.value })} />
        </label>
      </div>

      {value.frequency === "weekly" && (
        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium">Dias da semana</span>
          <div className="flex flex-wrap gap-1.5">
            {WEEKDAY_LABELS.map((label, day) => {
              const active = value.weekdays.includes(day);
              return (
                <button
                  key={label}
                  type="button"
                  aria-pressed={active}
                  onClick={() => toggleWeekday(day)}
                  className={[
                    "w-12 rounded-full border py-1 text-sm transition-colors",
                    active
                      ? "border-primary bg-primary text-bg"
                      : "border-border text-muted hover:bg-surface-hover hover:text-text",
                  ].join(" ")}
                >
                  {label}
                </button>
              );
            })}
          </div>
          {value.weekdays.length === 0 && (
            <span className="text-xs text-red-400">Escolha pelo menos um dia.</span>
          )}
        </div>
      )}

      {value.frequency === "monthly" && (
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium">Dia do mês</span>
          <Input
            type="number"
            min={1}
            max={31}
            className="w-28"
            value={value.monthDay}
            onChange={(e) => set({ monthDay: Number(e.target.value) })}
          />
          <span className="text-xs text-muted">
            Em meses mais curtos, cai no último dia do mês.
          </span>
        </label>
      )}
    </div>
  );
}
