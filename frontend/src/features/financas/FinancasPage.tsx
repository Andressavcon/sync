import { useState } from "react";
import CaixinhaSecao from "./components/CaixinhaSecao";
import CartoesSecao from "./components/CartoesSecao";
import ContasFixasSecao from "./components/ContasFixasSecao";
import LancamentosSecao from "./components/LancamentosSecao";
import Resumo from "./components/Resumo";

type Aba = "cartoes" | "contas" | "caixinha" | "lancamentos";

const ABAS: { id: Aba; rotulo: string }[] = [
  { id: "cartoes", rotulo: "Cartões" },
  { id: "contas", rotulo: "Contas fixas" },
  { id: "caixinha", rotulo: "Caixinha" },
  { id: "lancamentos", rotulo: "Lançamentos" },
];

export default function FinancasPage() {
  const [aba, setAba] = useState<Aba>("cartoes");

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-4">
      <h1 className="text-2xl font-semibold">Finanças</h1>

      <Resumo />

      <nav className="flex flex-wrap gap-2" aria-label="Seções de Finanças">
        {ABAS.map((a) => (
          <button
            key={a.id}
            type="button"
            aria-pressed={aba === a.id}
            onClick={() => setAba(a.id)}
            className={[
              "rounded-full border px-4 py-1.5 text-sm font-medium transition-colors",
              aba === a.id
                ? "border-primary bg-primary text-bg"
                : "border-border text-muted hover:bg-surface-hover hover:text-text",
            ].join(" ")}
          >
            {a.rotulo}
          </button>
        ))}
      </nav>

      {aba === "cartoes" && <CartoesSecao />}
      {aba === "contas" && <ContasFixasSecao />}
      {aba === "caixinha" && <CaixinhaSecao />}
      {aba === "lancamentos" && <LancamentosSecao />}
    </div>
  );
}
