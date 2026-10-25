import { useEffect, useReducer, useRef } from "react";
import { Check, Pause, Play, SkipBack, SkipForward, X } from "lucide-react";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import { beep } from "@/lib/beep";
import { useNow } from "@/hooks/useNow";
import { useWakeLock } from "@/hooks/useWakeLock";
import { useTreinos } from "../hooks/useTreinos";
import { ehCronometrado, estadoInicial, reduzir, restanteDe, type Acao, type EstadoCrono } from "../utils/cronometro";
import { montarPassos, type Passo } from "../utils/passos";
import type { BlocoDia } from "../types";
import AnelCronometro from "./AnelCronometro";

interface CronometroProps {
  bloco: BlocoDia;
  passos: Passo[];
  data: string;
  onClose: () => void;
}

function Cronometro({ bloco, passos, data, onClose }: CronometroProps) {
  const salvarProgresso = useTreinos((s) => s.salvarProgresso);
  const concluirBloco = useTreinos((s) => s.concluirBloco);

  const [estado, dispatch] = useReducer(
    (e: EstadoCrono, a: Acao) => reduzir(passos, e, a),
    undefined,
    () => estadoInicial(passos, bloco.passoIndex, bloco.restanteMs, Date.now())
  );

  const agora = useNow(250).getTime();
  const passo = passos[estado.idx];
  const restante = restanteDe(estado, agora);
  const cronometrado = ehCronometrado(passo);
  const pausado = estado.pausadoMs != null;
  const proxima = passos.slice(estado.idx + 1).find((p) => p.tipo !== "descanso");

  useWakeLock(true);

  // "tick": avança sozinho quando o tempo de uma etapa/descanso acaba
  useEffect(() => {
    const id = setInterval(() => dispatch({ tipo: "tick", agora: Date.now() }), 250);
    return () => clearInterval(id);
  }, []);

  // guarda o passo atual; o bloco fica "em andamento"
  useEffect(() => {
    if (!estado.fim) salvarProgresso(data, bloco.id, estado.idx);
  }, [estado.idx, estado.fim, salvarProgresso, data, bloco.id]);

  // aviso sonoro a cada mudança de passo
  const idxAnterior = useRef(estado.idx);
  useEffect(() => {
    if (idxAnterior.current !== estado.idx) {
      beep();
      idxAnterior.current = estado.idx;
    }
  }, [estado.idx]);

  // última etapa concluída: marca o bloco, mostra os parabéns e fecha
  useEffect(() => {
    if (!estado.fim) return;
    concluirBloco(data, bloco.id);
    beep(660, 500);
    const t = setTimeout(onClose, 2800);
    return () => clearTimeout(t);
  }, [estado.fim, concluirBloco, data, bloco.id, onClose]);

  /** Fechar no meio guarda o progresso: o bloco é retomado da etapa em que parou */
  function fechar() {
    if (!estado.fim) {
      salvarProgresso(data, bloco.id, estado.idx, restanteDe(estado, Date.now()) ?? undefined);
    }
    onClose();
  }

  const agir = (tipo: Acao["tipo"]) => dispatch({ tipo, agora: Date.now() });

  if (estado.fim) {
    return (
      <Modal onClose={fechar}>
        <div className="flex flex-col items-center gap-3 p-10 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary text-bg">
            <Check size={36} strokeWidth={3} />
          </div>
          <h2 className="text-2xl font-semibold">Parabéns!</h2>
          <p className="text-muted">{bloco.titulo} concluído.</p>
        </div>
      </Modal>
    );
  }

  const ehSerie = passo.tipo === "serie";
  const ehDescanso = passo.tipo === "descanso";

  return (
    <Modal onClose={fechar}>
      <div className="flex flex-col items-center gap-5 p-6">
        <header className="flex w-full items-center justify-between gap-2">
          <span className="truncate text-sm text-muted">{bloco.titulo}</span>
          <Button variant="ghost" size="icon" aria-label="Fechar e guardar progresso" onClick={fechar}>
            <X size={20} />
          </Button>
        </header>

        <p className="text-sm text-muted">
          Etapa {passo.etapaIndex + 1} de {bloco.etapas.length}
          {ehSerie && ` · série ${passo.serie}/${passo.totalSeries}`}
        </p>

        {cronometrado ? (
          <AnelCronometro
            restanteMs={restante ?? 0}
            totalMs={(passo.duracaoSeg ?? 0) * 1000}
            rotulo={ehDescanso ? "Descanso" : "Em andamento"}
            pausado={pausado}
          />
        ) : (
          <div className="flex h-56 w-56 flex-col items-center justify-center rounded-full border-[10px] border-border">
            <span className="text-5xl font-semibold">
              {ehSerie ? passo.reps : String(passo.km).replace(".", ",")}
            </span>
            <span className="mt-1 text-xs uppercase tracking-wide text-muted">
              {ehSerie ? "repetições" : "km"}
            </span>
          </div>
        )}

        <div className="text-center">
          <h2 className="text-2xl font-semibold">{passo.nome}</h2>
          {passo.tipo === "distancia" && (
            <p className="mt-1 text-sm text-muted">Controle no relógio e toque em Concluir.</p>
          )}
        </div>

        <p className="text-sm text-muted">
          {proxima
            ? `Próxima: ${proxima.nome}${proxima.tipo === "serie" ? ` · série ${proxima.serie}/${proxima.totalSeries}` : ""}`
            : "Esta é a última etapa."}
        </p>

        <div className="flex w-full flex-wrap items-center justify-center gap-3">
          <Button variant="secondary" onClick={() => agir("voltar")}>
            <SkipBack size={16} /> Voltar
          </Button>

          {cronometrado ? (
            <Button className="min-w-36" onClick={() => agir(pausado ? "retomar" : "pausar")}>
              {pausado ? (
                <>
                  <Play size={16} /> Retomar
                </>
              ) : (
                <>
                  <Pause size={16} /> Pausar
                </>
              )}
            </Button>
          ) : (
            <Button className="min-w-36" onClick={() => agir("avancar")}>
              <Check size={16} /> {ehSerie ? "Concluir série" : "Concluir"}
            </Button>
          )}

          <Button variant="secondary" onClick={() => agir("pular")}>
            {ehDescanso ? "Pular descanso" : "Pular etapa"} <SkipForward size={16} />
          </Button>
        </div>
      </div>
    </Modal>
  );
}

interface Props {
  data: string;
  blocoId: string;
  onClose: () => void;
}

export default function TimerModal({ data, blocoId, onClose }: Props) {
  const bloco = useTreinos((s) => s.dias[data]?.find((b) => b.id === blocoId));
  if (!bloco) return null;

  const passos = montarPassos(bloco.etapas);

  if (passos.length === 0) {
    return (
      <Modal onClose={onClose}>
        <div className="flex flex-col items-center gap-4 p-8 text-center">
          <p>Este bloco não tem etapas.</p>
          <Button onClick={onClose}>Fechar</Button>
        </div>
      </Modal>
    );
  }

  return <Cronometro bloco={bloco} passos={passos} data={data} onClose={onClose} />;
}
