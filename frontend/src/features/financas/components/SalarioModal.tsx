import { useState } from "react";
import Button from "@/components/ui/Button";
import Field from "@/components/ui/Field";
import FormModal from "@/components/ui/FormModal";
import Input from "@/components/ui/Input";
import { parseBRL } from "@/lib/format";
import { fieldClass } from "@/lib/ui";
import { useFinancas } from "../hooks/useFinancas";

export default function SalarioModal({ onClose }: { onClose: () => void }) {
  const { salario, setSalario } = useFinancas();
  const [valorTxt, setValorTxt] = useState(String(salario.valor).replace(".", ","));
  const [dia, setDia] = useState(salario.dia);

  const valor = parseBRL(valorTxt);
  const valido = Number.isFinite(valor) && valor >= 0;

  function salvar() {
    if (!valido) return;
    setSalario({ valor, dia });
    onClose();
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
          <Button onClick={salvar} disabled={!valido}>
            Salvar
          </Button>
        </>
      }
    >
      <Field rotulo="Valor">
        <Input inputMode="decimal" value={valorTxt} onChange={(e) => setValorTxt(e.target.value)} />
      </Field>
      <Field rotulo="Dia em que cai" dica="O ciclo vai de um salário ao próximo e é a base do disponível para gastar.">
        <select className={fieldClass} value={dia} onChange={(e) => setDia(Number(e.target.value))}>
          {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
            <option key={d} value={d}>
              Dia {d}
            </option>
          ))}
        </select>
      </Field>
    </FormModal>
  );
}
