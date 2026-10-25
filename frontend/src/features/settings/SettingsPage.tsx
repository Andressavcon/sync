import Card from "@/components/ui/Card";
import Checkbox from "@/components/ui/Checkbox";
import { useModulesStore } from "@/hooks/useModules";
import { useSettings } from "@/hooks/useSettings";
import { MODULES, type ModuleId } from "@/lib/modules";
import { fieldClass } from "@/lib/ui";

const DESCRIPTIONS: Record<ModuleId, string> = {
  dashboard: "Visão geral do dia",
  kanban: "Tarefas da semana e eventos futuros",
  workouts: "Blocos de treino e cronômetro",
  shopping: "Lista de compras e gasto do mercado",
  finance: "Cartões, contas fixas e caixinhas",
  settings: "",
};

export default function SettingsPage() {
  const { enabled, toggle } = useModulesStore();
  const { billReminderDay, weeklyWorkoutGoal, setBillReminderDay, setWeeklyWorkoutGoal, error } =
    useSettings();

  const toggleable = MODULES.filter((m) => m.toggleable);
  const activeCount = toggleable.filter((m) => enabled[m.id]).length;

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4">
      <h1 className="text-2xl font-semibold">Configurações</h1>

      <Card title="Módulos" description="Módulos desativados somem do menu e do Dashboard.">
        <ul className="flex flex-col divide-y divide-border">
          {toggleable.map(({ id, label, icon: Icon }) => (
            <li key={id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
              <Icon size={20} className="shrink-0 text-primary" />
              <div className="min-w-0 flex-1">
                <p className="font-medium">{label}</p>
                <p className="text-sm text-muted">{DESCRIPTIONS[id]}</p>
              </div>
              <Checkbox label={`Ativar ${label}`} checked={enabled[id]} onChange={() => toggle(id)} />
            </li>
          ))}
        </ul>
        <p className="mt-4 text-sm text-muted">
          {activeCount} de {toggleable.length} módulos ativos
        </p>
      </Card>

      <Card title="Preferências" description="Salvas no servidor: valem em todos os seus aparelhos.">
        <div className="flex flex-col gap-4">
          {error && <p className="text-sm text-red-400">{error}</p>}
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">Lembrete de contas fixas</span>
            <select
              className={fieldClass}
              value={billReminderDay}
              onChange={(e) => void setBillReminderDay(Number(e.target.value))}
            >
              {Array.from({ length: 28 }, (_, i) => i + 1).map((day) => (
                <option key={day} value={day}>
                  A partir do dia {day}
                </option>
              ))}
            </select>
            <span className="text-xs text-muted">
              Dia do mês em que o Dashboard começa a avisar que as contas estão fechando.
            </span>
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">Meta de treinos por semana</span>
            <select
              className={fieldClass}
              value={weeklyWorkoutGoal}
              onChange={(e) => void setWeeklyWorkoutGoal(Number(e.target.value))}
            >
              {[1, 2, 3, 4, 5, 6, 7].map((n) => (
                <option key={n} value={n}>
                  {n} {n === 1 ? "treino" : "treinos"} por semana
                </option>
              ))}
            </select>
            <span className="text-xs text-muted">
              O total do mês no Dashboard usa esta meta × 4 semanas.
            </span>
          </label>
        </div>
      </Card>
    </div>
  );
}
