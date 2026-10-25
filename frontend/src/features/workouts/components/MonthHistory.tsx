import { useEffect, useState } from "react";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  parseISO,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "lucide-react";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import { workoutsRepository, type MonthHistory as History } from "@/data/repositories/workoutsRepository";
import { useSettings } from "@/hooks/useSettings";

const WEEK_STARTS_ON = 1; // Monday, like the Kanban

const STATE_LABELS = { not_started: "Não iniciado", in_progress: "Em andamento", done: "Concluído" };

interface Props {
  /** Changes when today's workout changes, to fetch the month again */
  refreshKey: number;
}

/** Month calendar: only for reference, no editing of past days (section 7.2). */
export default function MonthHistory({ refreshKey }: Props) {
  const weeklyGoal = useSettings((s) => s.weeklyWorkoutGoal);
  const [month, setMonth] = useState(() => startOfMonth(new Date()));
  const [history, setHistory] = useState<History | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const monthKey = format(month, "yyyy-MM");

  useEffect(() => {
    let active = true;
    workoutsRepository
      .getHistory(monthKey)
      .then((data) => active && setHistory(data))
      .catch(() => {}); // the page already shows connection problems
    return () => {
      active = false;
    };
  }, [monthKey, refreshKey]);

  const byDay = new Map((history?.month === monthKey ? history.days : []).map((d) => [d.day, d]));
  const cells = eachDayOfInterval({
    start: startOfWeek(month, { weekStartsOn: WEEK_STARTS_ON }),
    end: endOfWeek(endOfMonth(month), { weekStartsOn: WEEK_STARTS_ON }),
  });
  const today = new Date();
  const selectedDay = selected ? byDay.get(selected) : undefined;

  return (
    <Card>
      <header className="mb-3 flex items-center gap-1">
        <h2 className="flex-1 text-lg font-semibold capitalize">
          {format(month, "MMMM yyyy", { locale: ptBR })}
        </h2>
        <Button variant="ghost" size="icon" aria-label="Mês anterior" onClick={() => setMonth(addMonths(month, -1))}>
          <ChevronLeft size={16} />
        </Button>
        <Button variant="ghost" size="icon" aria-label="Próximo mês" onClick={() => setMonth(addMonths(month, 1))}>
          <ChevronRight size={16} />
        </Button>
      </header>

      <div className="grid grid-cols-7 gap-1 text-center text-xs text-muted">
        {cells.slice(0, 7).map((d) => (
          <span key={d.toISOString()} className="uppercase">
            {format(d, "EEEEE", { locale: ptBR })}
          </span>
        ))}
      </div>

      <div className="mt-1 grid grid-cols-7 gap-1">
        {cells.map((d) => {
          const key = format(d, "yyyy-MM-dd");
          const entry = byDay.get(key);
          return (
            <button
              key={key}
              type="button"
              onClick={() => setSelected(selected === key ? null : key)}
              className={[
                "flex aspect-square flex-col items-center justify-center rounded-lg text-sm transition-colors",
                isSameMonth(d, month) ? "" : "text-muted/40",
                isSameDay(d, today) ? "border border-primary" : "border border-transparent",
                selected === key ? "bg-surface-hover" : "hover:bg-surface-hover",
              ].join(" ")}
            >
              {format(d, "d")}
              <span
                className={[
                  "mt-0.5 h-1.5 w-1.5 rounded-full",
                  entry?.completed ? "bg-primary" : entry ? "bg-muted" : "bg-transparent",
                ].join(" ")}
              />
            </button>
          );
        })}
      </div>

      <p className="mt-4 text-sm text-muted">
        <span className="font-semibold text-text">
          {history?.month === monthKey ? history.completedDays : 0}/{weeklyGoal * 4}
        </span>{" "}
        treinos concluídos no mês
      </p>

      {selected && (
        <div className="mt-3 border-t border-border pt-3">
          <p className="mb-2 text-sm font-medium">
            {format(parseISO(selected), "d 'de' MMMM", { locale: ptBR })}
          </p>
          {!selectedDay ? (
            <p className="text-sm text-muted">Nenhum treino neste dia.</p>
          ) : (
            <ul className="flex flex-col gap-1 text-sm">
              {selectedDay.blocks.map((block, index) => (
                <li key={index} className="flex justify-between gap-2">
                  <span>{block.title}</span>
                  <span className="text-muted">{STATE_LABELS[block.state]}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </Card>
  );
}
