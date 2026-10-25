import Card from "@/components/ui/Card";
import Checkbox from "@/components/ui/Checkbox";
import { MODULES, type ModuleId } from "@/lib/modules";
import { useModulesStore } from "@/hooks/useModules";
import { useSettings } from "@/hooks/useSettings";

const DESCRICOES: Record<ModuleId, string> = {
  dashboard: "Visão geral do dia",
  kanban: "Tarefas da semana e eventos futuros",
  treinos: "Blocos de treino e cronômetro",
  compras: "Lista de compras e gasto do mercado",
  financas: "Cartões, contas fixas e caixinhas",
  configuracoes: "",
};

const selectClass =
  "w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-primary";

export default function ConfiguracoesPage() {
  const { enabled, toggle } = useModulesStore();
  const {
    diaLembreteContas,
    metaTreinosSemana,
    setDiaLembreteContas,
    setMetaTreinosSemana,
  } = useSettings();

  const toggleables = MODULES.filter((m) => m.toggleable);
  const ativos = toggleables.filter((m) => enabled[m.id]).length;

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4">
      <h1 className="text-2xl font-semibold">Configurações</h1>

      <Card
        title="Módulos"
        description="Módulos desativados somem do menu e do Dashboard."
      >
        <ul className="flex flex-col divide-y divide-border">
          {toggleables.map(({ id, label, icon: Icon }) => (
            <li key={id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
              <Icon size={20} className="shrink-0 text-primary" />
              <div className="min-w-0 flex-1">
                <p className="font-medium">{label}</p>
                <p className="text-sm text-muted">{DESCRICOES[id]}</p>
              </div>
              <Checkbox
                label={`Ativar ${label}`}
                checked={enabled[id]}
                onChange={() => toggle(id)}
              />
            </li>
          ))}
        </ul>
        <p className="mt-4 text-sm text-muted">
          {ativos} de {toggleables.length} módulos ativos
        </p>
      </Card>

      <Card title="Preferências">
        <div className="flex flex-col gap-4">
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">Lembrete de contas fixas</span>
            <select
              className={selectClass}
              value={diaLembreteContas}
              onChange={(e) => setDiaLembreteContas(Number(e.target.value))}
            >
              {Array.from({ length: 28 }, (_, i) => i + 1).map((dia) => (
                <option key={dia} value={dia}>
                  A partir do dia {dia}
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
              className={selectClass}
              value={metaTreinosSemana}
              onChange={(e) => setMetaTreinosSemana(Number(e.target.value))}
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