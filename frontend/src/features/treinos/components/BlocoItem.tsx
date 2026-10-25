import { useState } from "react";
import { ChevronDown, ChevronUp, Play, Trash2 } from "lucide-react";
import Button from "@/components/ui/Button";
import Checkbox from "@/components/ui/Checkbox";
import { useTreinos } from "../hooks/useTreinos";
import { descreverEtapa } from "../utils/formato";
import { montarPassos } from "../utils/passos";
import type { BlocoDia } from "../types";

interface Props {
  data: string;
  bloco: BlocoDia;
  onIniciar: (blocoId: string) => void;
}

export default function BlocoItem({ data, bloco, onIniciar }: Props) {
  const { alternarConcluido, removerBloco } = useTreinos();
  const [aberto, setAberto] = useState(false);

  const concluido = bloco.estado === "concluido";
  const andamento = bloco.estado === "em_andamento";
  const etapaAtual = (montarPassos(bloco.etapas)[bloco.passoIndex]?.etapaIndex ?? 0) + 1;

  return (
    <li className="rounded-lg border border-border bg-bg p-3">
      <div className="flex flex-wrap items-center gap-3">
        <Checkbox
          label={`Marcar ${bloco.titulo} como concluído`}
          checked={concluido}
          onChange={() => alternarConcluido(data, bloco.id)}
        />
        <div className="min-w-0 flex-1 basis-40">
          <p className={concluido ? "text-muted line-through" : "font-medium"}>{bloco.titulo}</p>
          <p className="text-xs text-muted">
            {bloco.etapas.length} etapas
            {andamento && ` · parou na etapa ${etapaAtual}`}
          </p>
        </div>

        {!concluido && (
          <Button onClick={() => onIniciar(bloco.id)}>
            <Play size={14} /> {andamento ? "Continuar" : "Iniciar"}
          </Button>
        )}
        <Button
          variant="ghost"
          size="icon"
          aria-label={aberto ? "Esconder etapas" : "Ver etapas"}
          onClick={() => setAberto(!aberto)}
        >
          {aberto ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Remover do dia"
          onClick={() => removerBloco(data, bloco.id)}
        >
          <Trash2 size={16} />
        </Button>
      </div>

      {aberto && (
        <ol className="mt-3 flex flex-col gap-1 border-t border-border pt-3 text-sm text-muted">
          {bloco.etapas.map((e, i) => (
            <li key={e.id}>
              {i + 1}. {descreverEtapa(e)}
            </li>
          ))}
        </ol>
      )}
    </li>
  );
}
