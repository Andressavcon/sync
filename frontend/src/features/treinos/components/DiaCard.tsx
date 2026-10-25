import { useDroppable } from "@dnd-kit/core";
import { Play } from "lucide-react";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import { useTreinos } from "../hooks/useTreinos";
import BlocoItem from "./BlocoItem";

interface Props {
  /** Dia de hoje (yyyy-MM-dd) */
  data: string;
  onIniciar: (blocoId: string) => void;
}

/** O treino do dia é montado soltando blocos da biblioteca aqui (seção 7.2). */
export default function DiaCard({ data, onIniciar }: Props) {
  const { setNodeRef, isOver } = useDroppable({ id: "dia-hoje" });
  const blocos = useTreinos((s) => s.dias[data]) ?? [];

  const concluidos = blocos.filter((b) => b.estado === "concluido").length;
  const proximo = blocos.find((b) => b.estado !== "concluido");
  const treinoConcluido = blocos.length > 0 && concluidos === blocos.length;

  return (
    <section
      ref={setNodeRef}
      className={[
        "rounded-xl border bg-surface p-4 transition-shadow lg:p-5",
        isOver ? "border-primary ring-2 ring-primary" : "border-border",
      ].join(" ")}
    >
      <header className="mb-4 flex flex-wrap items-center gap-3">
        <div className="flex-1">
          <h2 className="flex items-center gap-2 text-xl font-semibold">
            Treino de hoje
            {treinoConcluido && <Badge variant="primary">Concluído</Badge>}
          </h2>
          <p className="text-sm text-muted">
            {blocos.length === 0
              ? "Nenhum bloco montado"
              : `${concluidos} de ${blocos.length} ${blocos.length === 1 ? "bloco" : "blocos"}`}
          </p>
        </div>
        <Button disabled={!proximo} onClick={() => proximo && onIniciar(proximo.id)}>
          <Play size={16} /> {proximo?.estado === "em_andamento" ? "Continuar treino" : "Iniciar treino"}
        </Button>
      </header>

      {blocos.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border py-10 text-center text-sm text-muted">
          Arraste um bloco da biblioteca para cá, ou toque nele.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {blocos.map((b) => (
            <BlocoItem key={b.id} data={data} bloco={b} onIniciar={onIniciar} />
          ))}
        </ul>
      )}
    </section>
  );
}
