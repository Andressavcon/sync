import { useState } from "react";
import Button from "@/components/ui/Button";
import Field from "@/components/ui/Field";
import FormModal from "@/components/ui/FormModal";
import Input from "@/components/ui/Input";
import { parseBRL } from "@/lib/format";
import { fieldClass } from "@/lib/ui";
import { useFinancas } from "../hooks/useFinancas";
import type { ContaFixa } from "../types";

export default function ContaFormModal({ conta, onClose }: { conta?: ContaFixa; onClose: () => void }) {
  const { addContaFixa, updateContaFixa } = useFinancas();
  const [nome, setNome] = useState(conta?.nome ?? "");
  const [valorTxt, setValorTxt] = useState(conta ? String(conta.valor).replace(".", ",") : "");
  const [dia, setDia] = useState(conta?.diaVencimento ?? 10);

  const valor = parseBRL(valorTxt);
  const valido = nome.trim() !== "" && Number.isFinite(valor) && valor >= 0;

  function salvar() {
    if (!valido) return;
    const dados = { nome: nome.trim(), valor, diaVencimento: dia };
    if (conta) updateContaFixa(conta.id, dados);
    else addContaFixa(dados);
    onClose();
  }

  return (
    <FormModal
      titulo={conta ? "Editar conta fixa" : "Nova conta fixa"}
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
      <Field rotulo="Nome">
        <Input value={nome} onChange={(e) => setNome(e.target.value)} autoFocus={!conta} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field rotulo="Valor cadastrado" dica="Pode ser ajustado em cada mês.">
          <Input inputMode="decimal" placeholder="0,00" value={valorTxt} onChange={(e) => setValorTxt(e.target.value)} />
        </Field>
        <Field rotulo="Vencimento">
          <select className={fieldClass} value={dia} onChange={(e) => setDia(Number(e.target.value))}>
            {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
              <option key={d} value={d}>
                Dia {d}
              </option>
            ))}
          </select>
        </Field>
      </div>
    </FormModal>
  );
}
