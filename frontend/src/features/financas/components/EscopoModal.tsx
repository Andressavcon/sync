import Button from "@/components/ui/Button";
import FormModal from "@/components/ui/FormModal";
import type { Escopo } from "../types";

interface Props {
  titulo: string;
  onEscolher: (escopo: Escopo) => void;
  onClose: () => void;
}

/** "Só esta parcela" ou "esta e as próximas" (seção 9.4). */
export default function EscopoModal({ titulo, onEscolher, onClose }: Props) {
  return (
    <FormModal titulo={titulo} onClose={onClose}>
      <p className="text-sm text-muted">Esta compra é parcelada. Aplicar a quais parcelas?</p>
      <div className="flex flex-col gap-2">
        <Button variant="secondary" onClick={() => onEscolher("esta")}>
          Só esta parcela
        </Button>
        <Button onClick={() => onEscolher("proximas")}>Esta e as próximas</Button>
        <Button variant="ghost" onClick={onClose}>
          Cancelar
        </Button>
      </div>
    </FormModal>
  );
}
