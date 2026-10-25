import { useState } from "react";
import Button from "@/components/ui/Button";
import Field from "@/components/ui/Field";
import FormModal from "@/components/ui/FormModal";
import Input from "@/components/ui/Input";
import { formatBRL, parseBRL } from "@/lib/format";
import { useFinancas } from "../hooks/useFinancas";
import type { Pote } from "../types";

export type ModoPote = "guardar" | "retirar" | "ajustar" | "renomear";

const TITULOS: Record<ModoPote, string> = {
  guardar: "Guardar em",
  retirar: "Retirar de",
  ajustar: "Ajustar valor de",
  renomear: "Renomear",
};

const DICAS: Record<Exclude<ModoPote, "renomear">, string> = {
  guardar: "O valor guardado sai do disponível do ciclo.",
  retirar: "O valor retirado volta para o disponível do ciclo.",
  ajustar: "Correção direta do valor guardado; não altera o disponível.",
};

export default function PoteModal({ pote, modo, onClose }: { pote: Pote; modo: ModoPote; onClose: () => void }) {
  const { guardar, retirar, ajustar, renamePote } = useFinancas();
  const [nome, setNome] = useState(pote.nome);
  const [valorTxt, setValorTxt] = useState(modo === "ajustar" ? String(pote.valor).replace(".", ",") : "");

  const valor = parseBRL(valorTxt);
  const valido =
    modo === "renomear"
      ? nome.trim() !== ""
      : Number.isFinite(valor) &&
        (modo === "ajustar" ? valor >= 0 : valor > 0) &&
        (modo !== "retirar" || valor <= pote.valor);

  function salvar() {
    if (!valido) return;
    if (modo === "renomear") renamePote(pote.id, nome.trim());
    else if (modo === "guardar") guardar(pote.id, valor);
    else if (modo === "retirar") retirar(pote.id, valor);
    else ajustar(pote.id, valor);
    onClose();
  }

  return (
    <FormModal
      titulo={`${TITULOS[modo]} ${modo === "renomear" ? "pote" : pote.nome}`}
      onClose={onClose}
      rodape={
        <>
          <Button variant="secondary" className="ml-auto" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={salvar} disabled={!valido}>
            Confirmar
          </Button>
        </>
      }
    >
      {modo === "renomear" ? (
        <Field rotulo="Nome">
          <Input value={nome} onChange={(e) => setNome(e.target.value)} autoFocus />
        </Field>
      ) : (
        <Field
          rotulo="Valor"
          dica={`${DICAS[modo]}${modo === "retirar" ? ` Disponível no pote: ${formatBRL(pote.valor)}.` : ""}`}
        >
          <Input
            inputMode="decimal"
            placeholder="0,00"
            value={valorTxt}
            onChange={(e) => setValorTxt(e.target.value)}
            autoFocus
          />
        </Field>
      )}
    </FormModal>
  );
}
