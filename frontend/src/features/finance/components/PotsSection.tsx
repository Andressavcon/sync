import { useState, type FormEvent } from "react";
import { Pencil, PiggyBank, Plus, SlidersHorizontal, Trash2 } from "lucide-react";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Field from "@/components/ui/Field";
import FormModal from "@/components/ui/FormModal";
import Input from "@/components/ui/Input";
import { financeRepository, type Pot } from "@/data/repositories/financeRepository";
import { useApiData } from "@/hooks/useApiData";
import { formatBRL, parseBRL } from "@/lib/format";

type Change = (action: () => Promise<unknown>) => Promise<boolean>;
type Mode = "deposit" | "withdraw" | "adjust" | "rename";

const TITLES: Record<Mode, string> = {
  deposit: "Guardar em",
  withdraw: "Retirar de",
  adjust: "Ajustar valor de",
  rename: "Renomear",
};

const HINTS: Record<Exclude<Mode, "rename">, string> = {
  deposit: "O valor guardado sai do disponível do ciclo.",
  withdraw: "O valor retirado volta para o disponível do ciclo.",
  adjust: "Correção direta do valor guardado; não altera o disponível.",
};

function PotModal({ pot, mode, onClose, onChange }: { pot: Pot; mode: Mode; onClose: () => void; onChange: Change }) {
  const [name, setName] = useState(pot.name);
  const [valueText, setValueText] = useState(mode === "adjust" ? String(pot.balance).replace(".", ",") : "");
  const value = parseBRL(valueText);
  const valid =
    mode === "rename"
      ? name.trim() !== ""
      : Number.isFinite(value) && (mode === "adjust" ? value >= 0 : value > 0) && (mode !== "withdraw" || value <= pot.balance);

  async function save() {
    const action = {
      rename: () => financeRepository.renamePot(pot.id, name.trim()),
      deposit: () => financeRepository.deposit(pot.id, value),
      withdraw: () => financeRepository.withdraw(pot.id, value),
      adjust: () => financeRepository.setPotBalance(pot.id, value),
    }[mode];
    if (await onChange(action)) onClose();
  }

  return (
    <FormModal
      titulo={`${TITLES[mode]} ${mode === "rename" ? "pote" : pot.name}`}
      onClose={onClose}
      rodape={
        <>
          <Button variant="secondary" className="ml-auto" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={() => void save()} disabled={!valid}>
            Confirmar
          </Button>
        </>
      }
    >
      {mode === "rename" ? (
        <Field rotulo="Nome">
          <Input value={name} onChange={(e) => setName(e.target.value)} autoFocus />
        </Field>
      ) : (
        <Field
          rotulo="Valor"
          dica={`${HINTS[mode]}${mode === "withdraw" ? ` No pote: ${formatBRL(pot.balance)}.` : ""}`}
        >
          <Input inputMode="decimal" placeholder="0,00" value={valueText} onChange={(e) => setValueText(e.target.value)} autoFocus />
        </Field>
      )}
    </FormModal>
  );
}

export default function PotsSection({ version, onChange }: { version: number; onChange: Change }) {
  const { data, error } = useApiData(`pots:${version}`, financeRepository.listPots);
  const [action, setAction] = useState<{ pot: Pot; mode: Mode } | null>(null);
  const [newName, setNewName] = useState("");

  async function create(e: FormEvent) {
    e.preventDefault();
    if (newName.trim() && (await onChange(() => financeRepository.createPot(newName.trim())))) setNewName("");
  }

  function remove(pot: Pot) {
    if (pot.balance > 0) {
      window.alert(`Retire o valor de "${pot.name}" antes de excluir o pote.`);
      return;
    }
    if (window.confirm(`Excluir o pote "${pot.name}"?`)) void onChange(() => financeRepository.deletePot(pot.id));
  }

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <p className="flex items-center gap-2 text-sm text-muted">
          <PiggyBank size={16} /> Total guardado
        </p>
        <p className="text-4xl font-semibold tabular-nums text-primary">{formatBRL(data?.total ?? 0)}</p>
        {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        {data?.pots.map((pot) => (
          <Card key={pot.id}>
            <div className="flex items-start gap-2">
              <div className="min-w-0 flex-1">
                <h3 className="font-semibold">{pot.name}</h3>
                <p className="text-2xl font-semibold tabular-nums">{formatBRL(pot.balance)}</p>
              </div>
              <Button variant="ghost" size="icon" aria-label="Ajustar valor" onClick={() => setAction({ pot, mode: "adjust" })}>
                <SlidersHorizontal size={16} />
              </Button>
              <Button variant="ghost" size="icon" aria-label="Renomear pote" onClick={() => setAction({ pot, mode: "rename" })}>
                <Pencil size={16} />
              </Button>
              <Button variant="ghost" size="icon" aria-label="Excluir pote" onClick={() => remove(pot)}>
                <Trash2 size={16} />
              </Button>
            </div>
            <div className="mt-3 flex gap-2">
              <Button className="flex-1" onClick={() => setAction({ pot, mode: "deposit" })}>
                Guardar
              </Button>
              <Button variant="secondary" className="flex-1" disabled={pot.balance <= 0} onClick={() => setAction({ pot, mode: "withdraw" })}>
                Retirar
              </Button>
            </div>
          </Card>
        ))}
      </div>

      <form onSubmit={(e) => void create(e)} className="flex gap-2">
        <Input placeholder="Novo pote…" aria-label="Nome do novo pote" value={newName} onChange={(e) => setNewName(e.target.value)} />
        <Button type="submit" variant="secondary" disabled={!newName.trim()} className="shrink-0">
          <Plus size={16} /> Pote
        </Button>
      </form>

      {action && <PotModal pot={action.pot} mode={action.mode} onClose={() => setAction(null)} onChange={onChange} />}
    </div>
  );
}
