import type { ReactNode } from "react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { AlarmClock, ArrowRight, CalendarClock, CheckCircle2, Wallet } from "lucide-react";
import { Link } from "react-router-dom";
import Badge from "@/components/ui/Badge";
import Card from "@/components/ui/Card";
import { dashboardRepository, type DashboardCard, type DayMark } from "@/data/repositories/dashboardRepository";
import { useApiData } from "@/hooks/useApiData";
import { useEnabledModules } from "@/hooks/useModules";
import { useNow } from "@/hooks/useNow";
import { MODULES, type ModuleId } from "@/lib/modules";

const pathOf = (id: ModuleId) => MODULES.find((m) => m.id === id)?.path ?? "/";

function countdown(days: number): string {
  if (days === 0) return "hoje";
  if (days === 1) return "amanhã";
  return days > 1 ? `em ${days} dias` : `há ${-days} dias`;
}

function Panel({ title, to, children }: { title: string; to: string; children: ReactNode }) {
  return (
    <Card>
      <header className="mb-3 flex items-center gap-2">
        <h2 className="flex-1 text-lg font-semibold">{title}</h2>
        <Link to={to} className="inline-flex items-center gap-1 text-sm text-primary hover:text-primary-hover">
          Ver mais <ArrowRight size={14} />
        </Link>
      </header>
      {children}
    </Card>
  );
}

function CardLine({ card, showDate }: { card: DashboardCard; showDate?: boolean }) {
  return (
    <li className="flex items-center gap-2 py-1.5">
      <span className="min-w-0 flex-1 truncate">{card.title}</span>
      {card.status === "in_progress" && <Badge variant="primary">Em andamento</Badge>}
      {card.isLate && (
        <span className="inline-flex items-center gap-1 text-xs text-red-400">
          <AlarmClock size={12} /> {showDate ? countdown(card.daysUntil) : "atrasado"}
        </span>
      )}
      {!card.isLate && <span className="text-xs text-muted">{card.dueTime.slice(0, 5)}</span>}
    </li>
  );
}

const DOT_STYLE: Record<DayMark, string> = {
  done: "bg-primary border-primary",
  missed: "border-muted",
  today: "border-primary",
  rest: "border-transparent",
};

export default function DashboardPage() {
  const now = useNow();
  // Reloads every minute (useNow), so "late" and the countdowns stay right
  const { data, error } = useApiData(`dashboard:${format(now, "yyyy-MM-dd HH:mm")}`, dashboardRepository.get);
  const enabled = new Set(useEnabledModules().map((m) => m.id));

  if (!data) {
    return <p className={`py-10 text-center ${error ? "text-red-400" : "text-muted"}`}>{error ?? "Carregando…"}</p>;
  }

  const { kanban, workouts, bills, spending } = data;

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold">Olá!</h1>
        <p className="text-sm first-letter:uppercase text-muted">
          {format(parseISO(data.today), "EEEE, d 'de' MMMM", { locale: ptBR })}
        </p>
      </div>

      <div className="grid items-start gap-4 lg:grid-cols-2">
        {enabled.has("kanban") && (
          <Panel title="Hoje" to={pathOf("kanban")}>
            {kanban.today.length === 0 && kanban.late.length === 0 ? (
              <p className="text-sm text-muted">Nada pendente para hoje.</p>
            ) : (
              <>
                <ul className="divide-y divide-border">
                  {kanban.today.map((card) => (
                    <CardLine key={card.id} card={card} />
                  ))}
                </ul>
                {kanban.late.length > 0 && (
                  <div className="mt-3 rounded-xl border border-red-400/40 p-3">
                    <p className="mb-1 flex items-center gap-1.5 text-sm font-medium text-red-400">
                      <AlarmClock size={14} /> Atrasados
                    </p>
                    <ul className="divide-y divide-border">
                      {kanban.late.map((card) => (
                        <CardLine key={card.id} card={card} showDate />
                      ))}
                    </ul>
                  </div>
                )}
              </>
            )}
          </Panel>
        )}

        {enabled.has("kanban") && (
          <Panel title="Eventos futuros" to={pathOf("kanban")}>
            {kanban.upcoming.length === 0 ? (
              <p className="text-sm text-muted">Nenhum evento depois desta semana.</p>
            ) : (
              <ul className="divide-y divide-border">
                {kanban.upcoming.map((card) => (
                  <li key={card.id} className="flex items-center gap-2 py-1.5">
                    <CalendarClock size={14} className="shrink-0 text-muted" />
                    <span className="min-w-0 flex-1 truncate">{card.title}</span>
                    <span className="text-xs text-muted">{format(parseISO(card.dueDate), "dd/MM")}</span>
                    <Badge variant="primary">{countdown(card.daysUntil)}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        )}

        {enabled.has("workouts") && (
          <Panel title="Treino de hoje" to={pathOf("workouts")}>
            {workouts.blocks.length === 0 ? (
              <p className="text-sm text-muted">Nenhum bloco montado para hoje.</p>
            ) : (
              <>
                <p className="mb-2 text-sm text-muted">
                  {workouts.state === "done"
                    ? "Treino concluído!"
                    : `${workouts.doneBlocks} de ${workouts.blocks.length} blocos`}
                </p>
                <ul className="mb-3 flex flex-wrap gap-2">
                  {workouts.blocks.map((block, index) => (
                    <li key={index}>
                      <Badge variant={block.state === "done" ? "primary" : "neutral"}>{block.title}</Badge>
                    </li>
                  ))}
                </ul>
              </>
            )}
            <div className="flex items-center gap-3 border-t border-border pt-3">
              <div className="flex gap-2" aria-label="Últimos dias">
                {workouts.lastDays.map(({ day, mark }) => (
                  <span
                    key={day}
                    title={`${format(parseISO(day), "EEE dd/MM", { locale: ptBR })}: ${
                      { done: "treino feito", missed: "não concluído", rest: "descanso", today: "hoje" }[mark]
                    }`}
                    className={`flex h-4 w-4 items-center justify-center rounded-full border-2 ${DOT_STYLE[mark]}`}
                  >
                    {mark === "rest" && <span className="h-0.5 w-2.5 rounded bg-muted" />}
                  </span>
                ))}
              </div>
              <span className="ml-auto text-sm text-muted">
                <span className="font-semibold text-text">
                  {workouts.monthCompleted}/{workouts.monthGoal}
                </span>{" "}
                no mês
              </span>
            </div>
          </Panel>
        )}

        {enabled.has("finance") && (
          <Panel title="Finanças" to={pathOf("finance")}>
            <div className="flex flex-col gap-3">
              {bills.hasBills && bills.active && (
                <p className="flex items-center gap-2 text-sm">
                  {bills.allPaid ? (
                    <>
                      <CheckCircle2 size={16} className="text-primary" /> Contas do mês pagas.
                    </>
                  ) : (
                    <>
                      <AlarmClock size={16} className={bills.daysToNextDue! < 0 ? "text-red-400" : "text-primary"} />
                      {bills.daysToNextDue! > 0 &&
                        `As contas estão fechando: faltam ${bills.daysToNextDue} ${bills.daysToNextDue === 1 ? "dia" : "dias"} para o próximo vencimento.`}
                      {bills.daysToNextDue === 0 && "Uma conta fixa vence hoje."}
                      {bills.daysToNextDue! < 0 && `Há conta fixa vencida há ${-bills.daysToNextDue!} dias.`}
                    </>
                  )}
                </p>
              )}

              {spending.percent === null ? (
                <p className="flex items-center gap-2 text-sm text-muted">
                  <Wallet size={16} /> Cadastre o salário em Finanças para acompanhar os gastos da semana.
                </p>
              ) : (
                <div>
                  <p className="mb-1.5 text-sm">
                    Você já usou <span className="font-semibold">{spending.percent}%</span> do disponível da semana
                    {spending.over && <span className="text-red-400"> (passou do limite)</span>}.
                  </p>
                  <div className="h-2 overflow-hidden rounded-full bg-border">
                    <div
                      className={`h-full rounded-full ${spending.over ? "bg-red-400" : "bg-primary"}`}
                      style={{ width: `${Math.min(100, Math.max(0, spending.percent))}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          </Panel>
        )}
      </div>
    </div>
  );
}
