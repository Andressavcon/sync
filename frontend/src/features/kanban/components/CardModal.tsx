import { useState } from "react";
import { format } from "date-fns";
import { Plus, Trash2, X } from "lucide-react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Modal from "@/components/ui/Modal";
import { fieldClass } from "@/lib/ui";
import { useKanban } from "../hooks/useKanban";
import { STATUS_OPCOES, type KanbanCard, type Status } from "../types";

interface Props {
  /** Sem card = criando um novo */
  card?: KanbanCard;
  /** Data pré-preenchida ao criar (ex.: o dia da coluna onde clicou em +) */
  dataInicial?: string;
  onClose: () => void;
}

/** O card abre como uma página: título no topo, informações e o espaço de escrita abaixo (seção 4.3). */
export default function CardModal({ card, dataInicial, onClose }: Props) {
  const { tags, addCard, updateCard, removeCard, addTag } = useKanban();

  const [titulo, setTitulo] = useState(card?.titulo ?? "");
  const [tagIds, setTagIds] = useState<string[]>(card?.tags ?? []);
  const [status, setStatus] = useState<Status>(card?.status ?? "pendente");
  const [data, setData] = useState(
    card?.dataEntrega ?? dataInicial ?? format(new Date(), "yyyy-MM-dd")
  );
  const [hora, setHora] = useState(card?.horaEntrega ?? "09:00");
  const [conteudo, setConteudo] = useState(card?.conteudo ?? "");
  const [novaTag, setNovaTag] = useState("");

  const valido = titulo.trim() !== "" && data !== "" && hora !== "";

  function alternarTag(id: string) {
    setTagIds((atual) => (atual.includes(id) ? atual.filter((t) => t !== id) : [...atual, id]));
  }

  function criarTag() {
    const nome = novaTag.trim();
    if (!nome) return;
    const tag = addTag(nome);
    setTagIds((atual) => (atual.includes(tag.id) ? atual : [...atual, tag.id]));
    setNovaTag("");
  }

  function salvar() {
    if (!valido) return;
    const dados = {
      titulo: titulo.trim(),
      tags: tagIds,
      status,
      dataEntrega: data,
      horaEntrega: hora,
      conteudo,
    };
    if (card) updateCard(card.id, dados);
    else addCard(dados);
    onClose();
  }

  function excluir() {
    if (card && window.confirm(`Excluir o card "${card.titulo}"?`)) {
      removeCard(card.id);
      onClose();
    }
  }

  return (
    <Modal onClose={onClose}>
      <div className="flex flex-col gap-5 p-5">
        <div className="flex items-start gap-2">
          <input
            autoFocus={!card}
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            placeholder="Título do card"
            aria-label="Título"
            className="min-w-0 flex-1 bg-transparent text-2xl font-semibold outline-none placeholder:text-muted"
          />
          <Button variant="ghost" size="icon" aria-label="Fechar" onClick={onClose}>
            <X size={20} />
          </Button>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">Status</span>
            <select
              className={fieldClass}
              value={status}
              onChange={(e) => setStatus(e.target.value as Status)}
            >
              {STATUS_OPCOES.map((s) => (
                <option key={s.valor} value={s.valor}>
                  {s.rotulo}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">Dia de entrega</span>
            <Input type="date" value={data} onChange={(e) => setData(e.target.value)} />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">Hora</span>
            <Input type="time" value={hora} onChange={(e) => setHora(e.target.value)} />
          </label>
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium">Tags</span>
          <div className="flex flex-wrap items-center gap-2">
            {tags.map((t) => {
              const ativa = tagIds.includes(t.id);
              return (
                <button
                  key={t.id}
                  type="button"
                  aria-pressed={ativa}
                  onClick={() => alternarTag(t.id)}
                  className={[
                    "rounded-full border px-3 py-1 text-sm transition-colors",
                    ativa
                      ? "border-primary bg-primary text-bg"
                      : "border-border text-muted hover:bg-surface-hover hover:text-text",
                  ].join(" ")}
                >
                  {t.nome}
                </button>
              );
            })}
          </div>
          <div className="flex gap-2">
            <Input
              placeholder="Nova tag…"
              aria-label="Nova tag"
              value={novaTag}
              onChange={(e) => setNovaTag(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  criarTag();
                }
              }}
            />
            <Button variant="secondary" onClick={criarTag} disabled={!novaTag.trim()} className="shrink-0">
              <Plus size={16} /> Tag
            </Button>
          </div>
        </div>

        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium">Anotações</span>
          <textarea
            className={`${fieldClass} min-h-56 resize-y`}
            placeholder="Escreva aqui: texto, links, o que precisar…"
            value={conteudo}
            onChange={(e) => setConteudo(e.target.value)}
          />
        </label>

        <div className="flex items-center gap-2">
          {card && (
            <Button variant="ghost" onClick={excluir}>
              <Trash2 size={16} /> Excluir
            </Button>
          )}
          <div className="ml-auto flex gap-2">
            <Button variant="secondary" onClick={onClose}>
              Cancelar
            </Button>
            <Button onClick={salvar} disabled={!valido}>
              Salvar
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
