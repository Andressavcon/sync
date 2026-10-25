import { useState } from "react";
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
import { format, isSameDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Plus } from "lucide-react";
import Button from "@/components/ui/Button";
import { useNow } from "@/hooks/useNow";
import CardItem from "./components/CardItem";
import CardModal from "./components/CardModal";
import KanbanColumn from "./components/KanbanColumn";
import KanbanFilters from "./components/KanbanFilters";
import { useKanban } from "./hooks/useKanban";
import { calcularSecoes, diasDaSemana } from "./utils/secoes";
import type { KanbanCard, Mostrar } from "./types";

interface Editor {
  card?: KanbanCard;
  dataInicial?: string;
}

export default function KanbanPage() {
  const { cards, tags, updateCard, moverParaDia } = useKanban();
  const now = useNow();

  const [mostrar, setMostrar] = useState<Mostrar>({
    finalizados: true,
    atrasados: true,
    futuros: true,
  });
  const [tagsSelecionadas, setTagsSelecionadas] = useState<string[]>([]);
  const [editor, setEditor] = useState<Editor | null>(null);
  const [arrastando, setArrastando] = useState<KanbanCard | null>(null);

  // Mouse arrasta após mover 6px; toque exige segurar um instante, para a rolagem continuar funcionando
  const sensores = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 6 } })
  );

  const visiveis = tagsSelecionadas.length
    ? cards.filter((c) => c.tags.some((t) => tagsSelecionadas.includes(t)))
    : cards;
  const secoes = calcularSecoes(visiveis, now);
  const dias = diasDaSemana(now);

  const colunaProps = {
    tags,
    now,
    onAbrir: (card: KanbanCard) => setEditor({ card }),
  };

  function aoComecar(e: DragStartEvent) {
    setArrastando(cards.find((c) => c.id === e.active.id) ?? null);
  }

  function aoSoltar(e: DragEndEvent) {
    setArrastando(null);
    if (!e.over) return;
    const id = String(e.active.id);
    const alvo = String(e.over.id);
    if (alvo.startsWith("dia:")) moverParaDia(id, alvo.slice(4));
    else if (alvo === "secao:finalizados") updateCard(id, { status: "feito" });
  }

  const inicioSemana = format(dias[0], "d 'de' MMM", { locale: ptBR });
  const fimSemana = format(dias[6], "d 'de' MMM", { locale: ptBR });

  return (
    <div className="mx-auto flex max-w-[1800px] flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Kanban</h1>
          <p className="text-sm text-muted">
            Semana de {inicioSemana} a {fimSemana}
          </p>
        </div>
        <Button onClick={() => setEditor({})}>
          <Plus size={16} /> Novo card
        </Button>
      </div>

      <KanbanFilters
        mostrar={mostrar}
        onMostrar={setMostrar}
        contagens={{
          atrasados: secoes.atrasados.length,
          futuros: secoes.futuros.length,
          finalizados: secoes.finalizados.length,
        }}
        tags={tags}
        tagsSelecionadas={tagsSelecionadas}
        onTags={setTagsSelecionadas}
      />

      <DndContext
        sensors={sensores}
        onDragStart={aoComecar}
        onDragEnd={aoSoltar}
        onDragCancel={() => setArrastando(null)}
      >
        <div className="grid items-start gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {dias.map((dia) => {
            const chave = format(dia, "yyyy-MM-dd");
            return (
              <KanbanColumn
                key={chave}
                id={`dia:${chave}`}
                titulo={format(dia, "EEEE", { locale: ptBR })}
                subtitulo={format(dia, "d 'de' MMMM", { locale: ptBR })}
                destaque={isSameDay(dia, now)}
                soltavel
                cards={secoes.dias[chave] ?? []}
                vazio="Nenhum card neste dia."
                onAdd={() => setEditor({ dataInicial: chave })}
                {...colunaProps}
              />
            );
          })}

          {mostrar.atrasados && (
            <KanbanColumn
              id="secao:atrasados"
              titulo="Atrasados"
              subtitulo="Não concluídos de semanas anteriores"
              cards={secoes.atrasados}
              vazio="Nada atrasado."
              mostrarData
              mostrarContagem
              {...colunaProps}
            />
          )}

          {mostrar.futuros && (
            <KanbanColumn
              id="secao:futuros"
              titulo="Eventos futuros"
              subtitulo="Depois desta semana"
              cards={secoes.futuros}
              vazio="Nenhum evento futuro."
              mostrarData
              mostrarContagem
              {...colunaProps}
            />
          )}

          {mostrar.finalizados && (
            <KanbanColumn
              id="secao:finalizados"
              titulo="Finalizados"
              subtitulo="Arraste um card para cá para concluir"
              soltavel
              cards={secoes.finalizados}
              vazio="Nenhum card finalizado."
              mostrarData
              {...colunaProps}
            />
          )}
        </div>

        <DragOverlay>
          {arrastando && <CardItem card={arrastando} tags={tags} now={now} />}
        </DragOverlay>
      </DndContext>

      {editor && (
        <CardModal
          card={editor.card}
          dataInicial={editor.dataInicial}
          onClose={() => setEditor(null)}
        />
      )}
    </div>
  );
}
