import { useState } from "react";
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
  subMonths,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "lucide-react";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import { useSettings } from "@/hooks/useSettings";
import { useTreinos } from "../hooks/useTreinos";
import { ESTADO_ROTULO, type BlocoDia } from "../types";

/** 1 = segunda. Depois isto pode virar preferência em Configurações. */
const COMECO_DA_SEMANA = 1;

const diaConcluido = (blocos: BlocoDia[] | undefined) =>
  !!blocos && blocos.length > 0 && blocos.every((b) => b.estado === "concluido");

/** Calendário do mês: só para consulta, sem editar dias passados (seção 7.2). */
export default function HistoricoMes() {
  const dias = useTreinos((s) => s.dias);
  const metaSemana = useSettings((s) => s.metaTreinosSemana);

  const [mes, setMes] = useState(() => startOfMonth(new Date()));
  const [selecionado, setSelecionado] = useState<string | null>(null);

  const celulas = eachDayOfInterval({
    start: startOfWeek(mes, { weekStartsOn: COMECO_DA_SEMANA }),
    end: endOfWeek(endOfMonth(mes), { weekStartsOn: COMECO_DA_SEMANA }),
  });

  const feitosNoMes = Object.entries(dias).filter(
    ([data, blocos]) => isSameMonth(parseISO(data), mes) && diaConcluido(blocos)
  ).length;
  const metaMes = metaSemana * 4; // seção 7.5: o mês conta sempre 4 semanas

  const hoje = new Date();
  const blocosSelecionados = selecionado ? (dias[selecionado] ?? []) : [];

  return (
    <Card>
      <header className="mb-3 flex items-center gap-1">
        <h2 className="flex-1 text-lg font-semibold capitalize">
          {format(mes, "MMMM yyyy", { locale: ptBR })}
        </h2>
        <Button variant="ghost" size="icon" aria-label="Mês anterior" onClick={() => setMes(subMonths(mes, 1))}>
          <ChevronLeft size={16} />
        </Button>
        <Button variant="ghost" size="icon" aria-label="Próximo mês" onClick={() => setMes(addMonths(mes, 1))}>
          <ChevronRight size={16} />
        </Button>
      </header>

      <div className="grid grid-cols-7 gap-1 text-center text-xs text-muted">
        {celulas.slice(0, 7).map((d) => (
          <span key={d.toISOString()} className="uppercase">
            {format(d, "EEEEE", { locale: ptBR })}
          </span>
        ))}
      </div>

      <div className="mt-1 grid grid-cols-7 gap-1">
        {celulas.map((d) => {
          const chave = format(d, "yyyy-MM-dd");
          const blocos = dias[chave];
          const feito = diaConcluido(blocos);
          const temBlocos = !!blocos && blocos.length > 0;
          const doMes = isSameMonth(d, mes);
          return (
            <button
              key={chave}
              type="button"
              onClick={() => setSelecionado(selecionado === chave ? null : chave)}
              className={[
                "flex aspect-square flex-col items-center justify-center rounded-lg text-sm transition-colors",
                doMes ? "" : "text-muted/40",
                isSameDay(d, hoje) ? "border border-primary" : "border border-transparent",
                selecionado === chave ? "bg-surface-hover" : "hover:bg-surface-hover",
              ].join(" ")}
            >
              {format(d, "d")}
              <span
                className={[
                  "mt-0.5 h-1.5 w-1.5 rounded-full",
                  feito ? "bg-primary" : temBlocos ? "bg-muted" : "bg-transparent",
                ].join(" ")}
              />
            </button>
          );
        })}
      </div>

      <p className="mt-4 text-sm text-muted">
        <span className="font-semibold text-text">
          {feitosNoMes}/{metaMes}
        </span>{" "}
        treinos concluídos no mês
      </p>

      {selecionado && (
        <div className="mt-3 border-t border-border pt-3">
          <p className="mb-2 text-sm font-medium">
            {format(parseISO(selecionado), "d 'de' MMMM", { locale: ptBR })}
          </p>
          {blocosSelecionados.length === 0 ? (
            <p className="text-sm text-muted">Nenhum treino neste dia.</p>
          ) : (
            <ul className="flex flex-col gap-1 text-sm">
              {blocosSelecionados.map((b) => (
                <li key={b.id} className="flex justify-between gap-2">
                  <span>{b.titulo}</span>
                  <span className="text-muted">{ESTADO_ROTULO[b.estado]}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </Card>
  );
}
