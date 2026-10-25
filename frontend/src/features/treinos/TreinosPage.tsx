import { useCallback, useState } from "react";
import {
  DndContext,
  DragOverlay,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useNow } from "@/hooks/useNow";
import Biblioteca from "./components/Biblioteca";
import DiaCard from "./components/DiaCard";
import HistoricoMes from "./components/HistoricoMes";
import TimerModal from "./components/TimerModal";
import { useTreinos } from "./hooks/useTreinos";
import { resolverOrigem } from "./utils/origem";
import type { Origem } from "./types";

export default function TreinosPage() {
  const { programas, avulsos, adicionarBloco } = useTreinos();
  const now = useNow();
  const hoje = format(now, "yyyy-MM-dd");

  const [timer, setTimer] = useState<{ data: string; blocoId: string } | null>(null);
  const [arrastando, setArrastando] = useState<string | null>(null);

  const fecharTimer = useCallback(() => setTimer(null), []);

  // Mouse arrasta após mover 6px; toque exige segurar um instante, para a rolagem continuar funcionando
  const sensores = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 6 } })
  );

  function lerId(id: string): { origem: Origem; origemId: string } | null {
    const [prefixo, origem, origemId] = id.split("|");
    if (prefixo !== "lib" || !origemId) return null;
    return { origem: origem as Origem, origemId };
  }

  function aoComecar(e: DragStartEvent) {
    const item = lerId(String(e.active.id));
    setArrastando(item ? (resolverOrigem(programas, avulsos, item.origem, item.origemId)?.titulo ?? null) : null);
  }

  function aoSoltar(e: DragEndEvent) {
    setArrastando(null);
    if (e.over?.id !== "dia-hoje") return;
    const item = lerId(String(e.active.id));
    if (item) adicionarBloco(hoje, item.origem, item.origemId);
  }

  return (
    <div className="mx-auto flex max-w-[1500px] flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold">Treinos</h1>
        <p className="text-sm capitalize text-muted">
          {format(now, "EEEE, d 'de' MMMM", { locale: ptBR })}
        </p>
      </div>

      <DndContext
        sensors={sensores}
        onDragStart={aoComecar}
        onDragEnd={aoSoltar}
        onDragCancel={() => setArrastando(null)}
      >
        <div className="grid items-start gap-4 xl:grid-cols-[18rem_1fr_20rem]">
          <div className="order-3 xl:order-1">
            <HistoricoMes />
          </div>
          <div className="order-1 xl:order-2">
            <DiaCard data={hoje} onIniciar={(blocoId) => setTimer({ data: hoje, blocoId })} />
          </div>
          <div className="order-2 xl:order-3">
            <Biblioteca onAdd={(origem, origemId) => adicionarBloco(hoje, origem, origemId)} />
          </div>
        </div>

        <DragOverlay>
          {arrastando && (
            <div className="rounded-lg border border-primary bg-surface px-3 py-2 text-sm shadow-lg">
              {arrastando}
            </div>
          )}
        </DragOverlay>
      </DndContext>

      {timer && <TimerModal data={timer.data} blocoId={timer.blocoId} onClose={fecharTimer} />}
    </div>
  );
}
