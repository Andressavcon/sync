import { useState } from "react";
import { ArrowLeft, Pencil, Plus, Trash2 } from "lucide-react";
import Button from "@/components/ui/Button";
import Field from "@/components/ui/Field";
import FormModal from "@/components/ui/FormModal";
import Input from "@/components/ui/Input";
import {
  workoutsRepository,
  type Program,
  type Session,
  type Step,
} from "@/data/repositories/workoutsRepository";
import { isStepValid } from "../utils/format";
import StepsEditor from "./StepsEditor";

interface Props {
  /** No program = creating a new one. It comes from the library, so it is always fresh. */
  program?: Program;
  onClose: () => void;
  onChange: (action: () => Promise<unknown>) => Promise<boolean>;
}

/** Steps of one session, shown inside the program window ("Voltar" goes back to the list). */
function SessionEditor({
  session,
  onBack,
  onChange,
}: {
  session: Session;
  onBack: () => void;
  onChange: Props["onChange"];
}) {
  const [steps, setSteps] = useState<Step[]>(session.steps);
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    if (await onChange(() => workoutsRepository.updateSession(session.id, steps))) onBack();
    else setBusy(false);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" aria-label="Voltar" onClick={onBack}>
          <ArrowLeft size={18} />
        </Button>
        <h3 className="text-lg font-semibold">Dia {session.number}</h3>
      </div>
      <StepsEditor steps={steps} onChange={setSteps} />
      <div className="flex justify-end gap-2">
        <Button variant="secondary" onClick={onBack}>
          Voltar
        </Button>
        <Button onClick={() => void save()} disabled={busy || !steps.every(isStepValid)}>
          Salvar dia
        </Button>
      </div>
    </div>
  );
}

/** Create a program, or edit its name and its numbered sessions. */
export default function ProgramModal({ program, onClose, onChange }: Props) {
  const [name, setName] = useState(program?.name ?? "");
  const [sessionCount, setSessionCount] = useState(21);
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const editingSession = program?.sessions.find((s) => s.id === editingSessionId);

  async function run(action: () => Promise<unknown>, closeAfter = false) {
    setBusy(true);
    const ok = await onChange(action);
    setBusy(false);
    if (ok && closeAfter) onClose();
  }

  function create() {
    void run(() => workoutsRepository.createProgram(name.trim(), sessionCount), true);
  }

  function removeProgram() {
    if (program && window.confirm(`Excluir o programa "${program.name}" e todos os dias dele?`)) {
      void run(() => workoutsRepository.deleteProgram(program.id), true);
    }
  }

  function removeSession(session: Session) {
    if (window.confirm(`Excluir o Dia ${session.number}? Os dias seguintes sobem uma posição.`)) {
      void run(() => workoutsRepository.deleteSession(session.id));
    }
  }

  if (!program) {
    const validCount = Number.isInteger(sessionCount) && sessionCount >= 0 && sessionCount <= 365;
    return (
      <FormModal
        titulo="Novo programa"
        onClose={onClose}
        rodape={
          <>
            <Button variant="secondary" className="ml-auto" onClick={onClose}>
              Cancelar
            </Button>
            <Button onClick={create} disabled={!name.trim() || !validCount || busy}>
              Criar
            </Button>
          </>
        }
      >
        <Field rotulo="Nome">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: Metabólico" autoFocus />
        </Field>
        <Field rotulo="Quantos dias?" dica="Os dias são criados vazios; você preenche as etapas depois.">
          <Input
            type="number"
            min={0}
            max={365}
            value={Number.isFinite(sessionCount) ? sessionCount : ""}
            onChange={(e) => setSessionCount(Number(e.target.value))}
          />
        </Field>
      </FormModal>
    );
  }

  return (
    <FormModal titulo={program.name} onClose={onClose}>
      {editingSession ? (
        <SessionEditor
          key={editingSession.id}
          session={editingSession}
          onBack={() => setEditingSessionId(null)}
          onChange={onChange}
        />
      ) : (
        <>
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <Field rotulo="Nome">
                <Input value={name} onChange={(e) => setName(e.target.value)} />
              </Field>
            </div>
            <Button
              variant="secondary"
              disabled={busy || !name.trim() || name.trim() === program.name}
              onClick={() => void run(() => workoutsRepository.renameProgram(program.id, name.trim()))}
            >
              Renomear
            </Button>
          </div>

          <ul className="flex flex-col divide-y divide-border rounded-xl border border-border">
            {program.sessions.length === 0 && (
              <li className="px-3 py-4 text-center text-sm text-muted">Nenhum dia ainda.</li>
            )}
            {program.sessions.map((session) => (
              <li key={session.id} className="flex items-center gap-2 px-3 py-2">
                <span className="flex-1">
                  <span className="font-medium">Dia {session.number}</span>
                  <span className="ml-2 text-sm text-muted">
                    {session.steps.length === 0
                      ? "sem etapas"
                      : `${session.steps.length} ${session.steps.length === 1 ? "etapa" : "etapas"}`}
                  </span>
                </span>
                <Button variant="ghost" onClick={() => setEditingSessionId(session.id)}>
                  <Pencil size={16} /> Etapas
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Excluir Dia ${session.number}`}
                  onClick={() => removeSession(session)}
                  disabled={busy}
                >
                  <Trash2 size={16} />
                </Button>
              </li>
            ))}
          </ul>

          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" disabled={busy} onClick={() => void run(() => workoutsRepository.addSession(program.id))}>
              <Plus size={16} /> Adicionar dia
            </Button>
            <Button variant="ghost" className="ml-auto" onClick={removeProgram} disabled={busy}>
              <Trash2 size={16} /> Excluir programa
            </Button>
          </div>
        </>
      )}
    </FormModal>
  );
}
