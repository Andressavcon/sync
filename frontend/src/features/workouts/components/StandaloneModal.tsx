import { useState } from "react";
import { Trash2 } from "lucide-react";
import Button from "@/components/ui/Button";
import Field from "@/components/ui/Field";
import FormModal from "@/components/ui/FormModal";
import Input from "@/components/ui/Input";
import {
  workoutsRepository,
  type Standalone,
  type Step,
} from "@/data/repositories/workoutsRepository";
import { isStepValid } from "../utils/format";
import StepsEditor from "./StepsEditor";

interface Props {
  /** No workout = creating a new one */
  workout?: Standalone;
  onClose: () => void;
  /** Runs a library change; true when it worked */
  onChange: (action: () => Promise<unknown>) => Promise<boolean>;
}

/** Create or edit a standalone workout: Corrida, Jump, Yoga... (section 7.2). */
export default function StandaloneModal({ workout, onClose, onChange }: Props) {
  const [name, setName] = useState(workout?.name ?? "");
  const [steps, setSteps] = useState<Step[]>(workout?.steps ?? []);
  const [busy, setBusy] = useState(false);

  const valid = name.trim() !== "" && steps.every(isStepValid);

  async function run(action: () => Promise<unknown>) {
    setBusy(true);
    if (await onChange(action)) onClose();
    else setBusy(false);
  }

  function save() {
    const cleanName = name.trim();
    void run(() =>
      workout
        ? workoutsRepository.updateStandalone(workout.id, { name: cleanName, steps })
        : workoutsRepository.createStandalone(cleanName, steps)
    );
  }

  function remove() {
    if (workout && window.confirm(`Excluir "${workout.name}"? Os dias que já usaram continuam no histórico.`)) {
      void run(() => workoutsRepository.deleteStandalone(workout.id));
    }
  }

  return (
    <FormModal
      titulo={workout ? "Editar treino avulso" : "Novo treino avulso"}
      onClose={onClose}
      rodape={
        <>
          {workout && (
            <Button variant="ghost" onClick={remove} disabled={busy}>
              <Trash2 size={16} /> Excluir
            </Button>
          )}
          <Button variant="secondary" className="ml-auto" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={save} disabled={!valid || busy}>
            Salvar
          </Button>
        </>
      }
    >
      <Field rotulo="Nome">
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: Corrida" autoFocus={!workout} />
      </Field>
      <StepsEditor steps={steps} onChange={setSteps} />
    </FormModal>
  );
}
