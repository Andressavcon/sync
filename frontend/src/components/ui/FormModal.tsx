import type { ReactNode } from "react";
import { X } from "lucide-react";
import Button from "./Button";
import Modal from "./Modal";

interface Props {
  titulo: string;
  onClose: () => void;
  children: ReactNode;
  /** Botões do rodapé */
  rodape?: ReactNode;
}

/** Modal padrão de formulário: título, fechar, conteúdo e rodapé. */
export default function FormModal({ titulo, onClose, children, rodape }: Props) {
  return (
    <Modal onClose={onClose}>
      <div className="flex flex-col gap-4 p-5">
        <header className="flex items-center gap-2">
          <h2 className="flex-1 text-xl font-semibold">{titulo}</h2>
          <Button variant="ghost" size="icon" aria-label="Fechar" onClick={onClose}>
            <X size={20} />
          </Button>
        </header>
        {children}
        {rodape && <div className="flex flex-wrap items-center gap-2">{rodape}</div>}
      </div>
    </Modal>
  );
}
