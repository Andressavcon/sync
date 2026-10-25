import { useState } from "react";
import Button from "@/components/ui/Button";
import Checkbox from "@/components/ui/Checkbox";
import Field from "@/components/ui/Field";
import FormModal from "@/components/ui/FormModal";
import Input from "@/components/ui/Input";
import { financeRepository, type Card } from "@/data/repositories/financeRepository";
import { fieldClass } from "@/lib/ui";
import { DAYS_OF_MONTH } from "../utils/months";

interface Props {
  card?: Card;
  onClose: () => void;
  onChange: (action: () => Promise<unknown>) => Promise<boolean>;
}

export default function CardFormModal({ card, onClose, onChange }: Props) {
  const [name, setName] = useState(card?.name ?? "");
  const [dueDay, setDueDay] = useState(card?.dueDay ?? 10);
  const [closingDay, setClosingDay] = useState(card?.closingDay ?? 3);
  const [goesNext, setGoesNext] = useState(card?.closingDayPurchaseGoesNext ?? true);

  async function save() {
    const input = { name: name.trim(), dueDay, closingDay, closingDayPurchaseGoesNext: goesNext };
    const ok = await onChange(() =>
      card ? financeRepository.updateCard(card.id, input) : financeRepository.createCard(input)
    );
    if (ok) onClose();
  }

  return (
    <FormModal
      titulo={card ? "Editar cartão" : "Novo cartão"}
      onClose={onClose}
      rodape={
        <>
          <Button variant="secondary" className="ml-auto" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={() => void save()} disabled={!name.trim()}>
            Salvar
          </Button>
        </>
      }
    >
      <Field rotulo="Nome">
        <Input value={name} onChange={(e) => setName(e.target.value)} autoFocus={!card} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field rotulo="Dia do vencimento">
          <select className={fieldClass} value={dueDay} onChange={(e) => setDueDay(Number(e.target.value))}>
            {DAYS_OF_MONTH.map((d) => (
              <option key={d} value={d}>
                Dia {d}
              </option>
            ))}
          </select>
        </Field>
        <Field rotulo="Fechamento padrão" dica="Pode ser ajustado em cada fatura.">
          <select className={fieldClass} value={closingDay} onChange={(e) => setClosingDay(Number(e.target.value))}>
            {DAYS_OF_MONTH.map((d) => (
              <option key={d} value={d}>
                Dia {d}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <div className="flex items-start gap-2 text-sm">
        <Checkbox label="Compra no dia do fechamento vai para a próxima fatura" checked={goesNext} onChange={setGoesNext} />
        <span>
          Compra feita no dia do fechamento vai para a próxima fatura
          <span className="block text-xs text-muted">É o que a maioria dos bancos faz.</span>
        </span>
      </div>
    </FormModal>
  );
}
