import { useEffect, useState } from "react";
import { format } from "date-fns";
import { Plus, Repeat, Trash2, X } from "lucide-react";
import Button from "@/components/ui/Button";
import Checkbox from "@/components/ui/Checkbox";
import Input from "@/components/ui/Input";
import Modal from "@/components/ui/Modal";
import { ApiError, getErrorMessage } from "@/data/api";
import {
  kanbanRepository,
  type Card,
  type CardInput,
  type CardStatus,
  type Recurrence,
  type Scope,
  type Tag,
} from "@/data/repositories/kanbanRepository";
import { fieldClass } from "@/lib/ui";
import { STATUS_OPTIONS, type RepeatSettings } from "../types";
import { defaultRepeat, describeRecurrence, isRepeatValid, shortTime } from "../utils/format";
import RepeatFields from "./RepeatFields";

interface Props {
  /** No card = creating a new one */
  card?: Card;
  /** Date filled in when creating (e.g. the column where + was clicked) */
  initialDate?: string;
  tags: Tag[];
  onClose: () => void;
  /** Called after any saved change, so the page reloads the board */
  onChanged: () => void;
}

/** The card opens like a page: title on top, details and the writing space below (4.3). */
export default function CardModal({ card, initialDate, tags, onClose, onChanged }: Props) {
  const [title, setTitle] = useState(card?.title ?? "");
  const [status, setStatus] = useState<CardStatus>(card?.status ?? "pending");
  const [dueDate, setDueDate] = useState(
    card?.dueDate ?? initialDate ?? format(new Date(), "yyyy-MM-dd")
  );
  const [dueTime, setDueTime] = useState(card ? shortTime(card.dueTime) : "09:00");
  const [tagIds, setTagIds] = useState<string[]>(card?.tags.map((t) => t.id) ?? []);
  const [content, setContent] = useState(card?.content ?? "");
  const [availableTags, setAvailableTags] = useState(tags);
  const [newTag, setNewTag] = useState("");
  // Only when creating: null = doesn't repeat
  const [repeat, setRepeat] = useState<RepeatSettings | null>(null);
  // Existing recurring card: its rule, to describe it
  const [recurrence, setRecurrence] = useState<Recurrence | null>(null);
  // Recurring card: waiting for "only this / this and following" before saving or deleting
  const [askScopeFor, setAskScopeFor] = useState<"save" | "delete" | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const recurrenceId = card?.recurrenceId ?? null;
  const valid =
    title.trim() !== "" && dueDate !== "" && dueTime !== "" && (!repeat || isRepeatValid(repeat));

  useEffect(() => {
    if (!recurrenceId) return;
    let active = true;
    kanbanRepository
      .getRecurrence(recurrenceId)
      .then((rule) => active && setRecurrence(rule))
      .catch(() => {}); // only a description: the card works without it
    return () => {
      active = false;
    };
  }, [recurrenceId]);

  /** Runs a change on the API; on success reloads the page and closes. */
  async function run(action: () => Promise<unknown>) {
    setBusy(true);
    setError(null);
    try {
      await action();
      onChanged();
      onClose();
    } catch (e) {
      setError(getErrorMessage(e));
      setBusy(false);
      setAskScopeFor(null);
    }
  }

  function cardInput(): CardInput {
    return { title: title.trim(), content, status, dueDate, dueTime, tagIds };
  }

  function save() {
    if (!valid || busy) return;
    if (!card) {
      if (repeat) {
        void run(() =>
          kanbanRepository.createRecurrence({
            title: title.trim(),
            content,
            dueTime,
            tagIds,
            frequency: repeat.frequency,
            weekdays: repeat.frequency === "weekly" ? repeat.weekdays : [],
            monthDay: repeat.frequency === "monthly" ? repeat.monthDay : null,
            startDate: dueDate,
            endDate: repeat.endDate || null,
          })
        );
      } else {
        void run(() => kanbanRepository.createCard(cardInput()));
      }
    } else if (recurrenceId) {
      setAskScopeFor("save");
    } else {
      void run(() => kanbanRepository.updateCard(card.id, cardInput()));
    }
  }

  function remove() {
    if (!card) return;
    if (recurrenceId) setAskScopeFor("delete");
    else if (window.confirm(`Excluir o card "${card.title}"?`)) {
      void run(() => kanbanRepository.deleteCard(card.id));
    }
  }

  function applyWithScope(scope: Scope) {
    if (!card) return;
    if (askScopeFor === "save") void run(() => kanbanRepository.updateCard(card.id, cardInput(), scope));
    else void run(() => kanbanRepository.deleteCard(card.id, scope));
  }

  function stopRepeating() {
    if (
      recurrenceId &&
      window.confirm("Parar de repetir? As próximas ocorrências não concluídas serão removidas.")
    ) {
      void run(() => kanbanRepository.deleteRecurrence(recurrenceId));
    }
  }

  function toggleTag(id: string) {
    setTagIds((ids) => (ids.includes(id) ? ids.filter((t) => t !== id) : [...ids, id]));
  }

  async function createTag() {
    const name = newTag.trim();
    if (!name) return;
    setError(null);
    try {
      const tag = await kanbanRepository.createTag(name);
      setAvailableTags((list) => [...list, tag]);
      setTagIds((ids) => [...ids, tag.id]);
      onChanged();
    } catch (e) {
      // Already exists: just select it
      const existing = availableTags.find((t) => t.name.toLowerCase() === name.toLowerCase());
      if (e instanceof ApiError && e.status === 409 && existing) {
        setTagIds((ids) => (ids.includes(existing.id) ? ids : [...ids, existing.id]));
      } else {
        setError(getErrorMessage(e));
        return;
      }
    }
    setNewTag("");
  }

  return (
    <Modal onClose={onClose}>
      <div className="flex flex-col gap-5 p-5">
        <div className="flex items-start gap-2">
          <input
            autoFocus={!card}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Título do card"
            aria-label="Título"
            className="min-w-0 flex-1 bg-transparent text-2xl font-semibold outline-none placeholder:text-muted"
          />
          <Button variant="ghost" size="icon" aria-label="Fechar" onClick={onClose}>
            <X size={20} />
          </Button>
        </div>

        <div className={`grid gap-3 ${repeat ? "sm:grid-cols-2" : "sm:grid-cols-3"}`}>
          {!repeat && (
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium">Status</span>
              <select
                className={fieldClass}
                value={status}
                onChange={(e) => setStatus(e.target.value as CardStatus)}
              >
                {STATUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          )}
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">{repeat ? "Começa em" : "Dia de entrega"}</span>
            <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">Hora</span>
            <Input type="time" value={dueTime} onChange={(e) => setDueTime(e.target.value)} />
          </label>
        </div>

        {/* Repeat: new cards can turn it on; recurring cards show the rule */}
        {!card && (
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2 text-sm">
              <Checkbox
                label="Repetir"
                checked={repeat !== null}
                onChange={(on) => setRepeat(on ? defaultRepeat(dueDate) : null)}
              />
              <span>Repetir</span>
            </div>
            {repeat && <RepeatFields value={repeat} onChange={setRepeat} />}
          </div>
        )}
        {recurrenceId && (
          <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm">
            <Repeat size={16} className="text-primary" />
            <span className="flex-1">
              {recurrence ? describeRecurrence(recurrence) : "Card recorrente"}
            </span>
            <Button variant="ghost" onClick={stopRepeating} disabled={busy}>
              Parar de repetir
            </Button>
          </div>
        )}

        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium">Tags</span>
          <div className="flex flex-wrap items-center gap-2">
            {availableTags.map((tag) => {
              const active = tagIds.includes(tag.id);
              return (
                <button
                  key={tag.id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => toggleTag(tag.id)}
                  className={[
                    "rounded-full border px-3 py-1 text-sm transition-colors",
                    active
                      ? "border-primary bg-primary text-bg"
                      : "border-border text-muted hover:bg-surface-hover hover:text-text",
                  ].join(" ")}
                >
                  {tag.name}
                </button>
              );
            })}
          </div>
          <div className="flex gap-2">
            <Input
              placeholder="Nova tag…"
              aria-label="Nova tag"
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  void createTag();
                }
              }}
            />
            <Button
              variant="secondary"
              onClick={() => void createTag()}
              disabled={!newTag.trim()}
              className="shrink-0"
            >
              <Plus size={16} /> Tag
            </Button>
          </div>
        </div>

        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium">Anotações</span>
          <textarea
            className={`${fieldClass} min-h-56 resize-y`}
            placeholder="Escreva aqui: texto, links, o que precisar…"
            value={content}
            onChange={(e) => setContent(e.target.value)}
          />
        </label>

        {error && <p className="text-sm text-red-400">{error}</p>}

        {askScopeFor ? (
          <div className="flex flex-col gap-3 rounded-lg border border-primary p-3">
            <p className="text-sm">
              Este card se repete. {askScopeFor === "save" ? "Salvar as mudanças em:" : "Excluir:"}
            </p>
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => applyWithScope("this")} disabled={busy}>
                Só este
              </Button>
              <Button onClick={() => applyWithScope("following")} disabled={busy}>
                Este e os próximos
              </Button>
              <Button variant="ghost" className="ml-auto" onClick={() => setAskScopeFor(null)}>
                Voltar
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            {card && (
              <Button variant="ghost" onClick={remove} disabled={busy}>
                <Trash2 size={16} /> Excluir
              </Button>
            )}
            <div className="ml-auto flex gap-2">
              <Button variant="secondary" onClick={onClose}>
                Cancelar
              </Button>
              <Button onClick={save} disabled={!valid || busy}>
                Salvar
              </Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
