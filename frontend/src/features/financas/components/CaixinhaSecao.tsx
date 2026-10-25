import { useState, type FormEvent } from "react";
import { Pencil, PiggyBank, Plus, SlidersHorizontal, Trash2 } from "lucide-react";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import { formatBRL } from "@/lib/format";
import { useFinancas } from "../hooks/useFinancas";
import type { Pote } from "../types";
import PoteModal, { type ModoPote } from "./PoteModal";

export default function CaixinhaSecao() {
  const { potes, addPote, removePote } = useFinancas();
  const [acao, setAcao] = useState<{ pote: Pote; modo: ModoPote } | null>(null);
  const [novo, setNovo] = useState("");

  const total = potes.reduce((t, p) => t + p.valor, 0);

  function criar(e: FormEvent) {
    e.preventDefault();
    if (!novo.trim()) return;
    addPote(novo.trim());
    setNovo("");
  }

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <p className="flex items-center gap-2 text-sm text-muted">
          <PiggyBank size={16} /> Total guardado
        </p>
        <p className="text-4xl font-semibold tabular-nums text-primary">{formatBRL(total)}</p>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        {potes.map((p) => (
          <Card key={p.id}>
            <div className="flex items-start gap-2">
              <div className="min-w-0 flex-1">
                <h3 className="font-semibold">{p.nome}</h3>
                <p className="text-2xl font-semibold tabular-nums">{formatBRL(p.valor)}</p>
              </div>
              <Button variant="ghost" size="icon" aria-label="Ajustar valor" onClick={() => setAcao({ pote: p, modo: "ajustar" })}>
                <SlidersHorizontal size={16} />
              </Button>
              <Button variant="ghost" size="icon" aria-label="Renomear pote" onClick={() => setAcao({ pote: p, modo: "renomear" })}>
                <Pencil size={16} />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Excluir pote"
                onClick={() => window.confirm(`Excluir o pote "${p.nome}"?`) && removePote(p.id)}
              >
                <Trash2 size={16} />
              </Button>
            </div>
            <div className="mt-3 flex gap-2">
              <Button className="flex-1" onClick={() => setAcao({ pote: p, modo: "guardar" })}>
                Guardar
              </Button>
              <Button
                variant="secondary"
                className="flex-1"
                disabled={p.valor <= 0}
                onClick={() => setAcao({ pote: p, modo: "retirar" })}
              >
                Retirar
              </Button>
            </div>
          </Card>
        ))}
      </div>

      <form onSubmit={criar} className="flex gap-2">
        <Input placeholder="Novo pote…" aria-label="Nome do novo pote" value={novo} onChange={(e) => setNovo(e.target.value)} />
        <Button type="submit" variant="secondary" disabled={!novo.trim()} className="shrink-0">
          <Plus size={16} /> Pote
        </Button>
      </form>

      {acao && <PoteModal pote={acao.pote} modo={acao.modo} onClose={() => setAcao(null)} />}
    </div>
  );
}
