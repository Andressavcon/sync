import { useState } from "react";
import Button from "@/components/ui/Button";
import Field from "@/components/ui/Field";
import FormModal from "@/components/ui/FormModal";
import Input from "@/components/ui/Input";
import { fieldClass } from "@/lib/ui";
import { useFinancas } from "../hooks/useFinancas";
import type { Cartao } from "../types";

const DIAS = Array.from({ length: 31 }, (_, i) => i + 1);

export default function CartaoFormModal({ cartao, onClose }: { cartao?: Cartao; onClose: () => void }) {
  const { addCartao, updateCartao } = useFinancas();
  const [nome, setNome] = useState(cartao?.nome ?? "");
  const [vencimento, setVencimento] = useState(cartao?.diaVencimento ?? 10);
  const [fechamento, setFechamento] = useState(cartao?.diaFechamento ?? 3);

  function salvar() {
    if (!nome.trim()) return;
    const dados = { nome: nome.trim(), diaVencimento: vencimento, diaFechamento: fechamento };
    if (cartao) updateCartao(cartao.id, dados);
    else addCartao(dados);
    onClose();
  }

  return (
    <FormModal
      titulo={cartao ? "Editar cartão" : "Novo cartão"}
      onClose={onClose}
      rodape={
        <>
          <Button variant="secondary" className="ml-auto" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={salvar} disabled={!nome.trim()}>
            Salvar
          </Button>
        </>
      }
    >
      <Field rotulo="Nome">
        <Input value={nome} onChange={(e) => setNome(e.target.value)} autoFocus={!cartao} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field rotulo="Dia do vencimento">
          <select className={fieldClass} value={vencimento} onChange={(e) => setVencimento(Number(e.target.value))}>
            {DIAS.map((d) => (
              <option key={d} value={d}>
                Dia {d}
              </option>
            ))}
          </select>
        </Field>
        <Field rotulo="Fechamento padrão" dica="Pode ser ajustado em cada fatura.">
          <select className={fieldClass} value={fechamento} onChange={(e) => setFechamento(Number(e.target.value))}>
            {DIAS.map((d) => (
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
