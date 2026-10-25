import { useEffect, useState } from "react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Check, ChevronDown, ChevronUp } from "lucide-react";
import FormModal from "@/components/ui/FormModal";
import { getErrorMessage } from "@/data/api";
import { shoppingRepository, type ArchivedList } from "@/data/repositories/shoppingRepository";

/** Completed lists from the last 90 days, read-only. */
export default function ArchivesModal({ onClose }: { onClose: () => void }) {
  const [archives, setArchives] = useState<ArchivedList[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    shoppingRepository
      .listArchives()
      .then((lists) => active && setArchives(lists))
      .catch((e: unknown) => active && setError(getErrorMessage(e)));
    return () => {
      active = false;
    };
  }, []);

  return (
    <FormModal titulo="Listas anteriores" onClose={onClose}>
      {error && <p className="text-sm text-red-400">{error}</p>}
      {!archives && !error && <p className="text-sm text-muted">Carregando…</p>}
      {archives?.length === 0 && (
        <p className="text-sm text-muted">Nenhuma lista concluída nos últimos 90 dias.</p>
      )}

      <ul className="flex flex-col gap-2">
        {archives?.map((archive) => {
          const open = openId === archive.id;
          const bought = archive.items.filter((i) => i.purchased).length;
          return (
            <li key={archive.id} className="rounded-xl border border-border">
              <button
                type="button"
                aria-expanded={open}
                onClick={() => setOpenId(open ? null : archive.id)}
                className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-surface-hover"
              >
                <span className="flex-1">
                  <span className="block font-medium first-letter:uppercase">
                    {format(parseISO(archive.completedAt), "EEEE, d 'de' MMMM", { locale: ptBR })}
                  </span>
                  <span className="block text-xs text-muted">
                    {bought} de {archive.items.length} itens comprados
                  </span>
                </span>
                {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>
              {open && (
                <ul className="flex flex-col gap-1 border-t border-border px-3 py-2 text-sm">
                  {archive.items.map((item, index) => (
                    <li key={index} className="flex items-center gap-2">
                      <span className="w-4 text-primary">
                        {item.purchased && <Check size={14} />}
                      </span>
                      <span className={item.purchased ? "" : "text-muted"}>
                        {item.name}
                        {item.quantity && ` · ${item.quantity}`}
                      </span>
                      <span className="ml-auto text-xs text-muted">{item.categoryName}</span>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          );
        })}
      </ul>
    </FormModal>
  );
}
