import { useState } from "react";
import Button from "@/components/ui/Button";
import Field from "@/components/ui/Field";
import FormModal from "@/components/ui/FormModal";
import Input from "@/components/ui/Input";
import { financeRepository, type Salary } from "@/data/repositories/financeRepository";
import { parseBRL } from "@/lib/format";
import { fieldClass } from "@/lib/ui";
import { DAYS_OF_MONTH } from "../utils/months";

interface Props {
  salary: Salary;
  onClose: () => void;
  onChange: (action: () => Promise<unknown>) => Promise<boolean>;
}

export default function SalaryModal({ salary, onClose, onChange }: Props) {
  const [amountText, setAmountText] = useState(
    salary.configured ? String(salary.amount).replace(".", ",") : ""
  );
  const [day, setDay] = useState(salary.day);
  const amount = parseBRL(amountText);
  const valid = Number.isFinite(amount) && amount >= 0;

  async function save() {
    if (valid && (await onChange(() => financeRepository.setSalary(amount, day)))) onClose();
  }

  return (
    <FormModal
      titulo="Salário"
      onClose={onClose}
      rodape={
        <>
          <Button variant="secondary" className="ml-auto" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={() => void save()} disabled={!valid}>
            Salvar
          </Button>
        </>
      }
    >
      <Field rotulo="Valor">
        <Input inputMode="decimal" placeholder="0,00" value={amountText} onChange={(e) => setAmountText(e.target.value)} autoFocus />
      </Field>
      <Field rotulo="Dia em que cai" dica="O ciclo vai de um salário ao próximo e é a base do disponível para gastar.">
        <select className={fieldClass} value={day} onChange={(e) => setDay(Number(e.target.value))}>
          {DAYS_OF_MONTH.map((d) => (
            <option key={d} value={d}>
              Dia {d}
            </option>
          ))}
        </select>
      </Field>
    </FormModal>
  );
}
