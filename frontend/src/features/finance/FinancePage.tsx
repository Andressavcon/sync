import { useState } from "react";
import { getErrorMessage } from "@/data/api";
import { financeRepository } from "@/data/repositories/financeRepository";
import { useApiData } from "@/hooks/useApiData";
import CardsSection from "./components/CardsSection";
import FixedBillsSection from "./components/FixedBillsSection";
import Overview from "./components/Overview";
import PotsSection from "./components/PotsSection";
import TransactionsSection from "./components/TransactionsSection";

type Tab = "cards" | "bills" | "pots" | "transactions";

const TABS: { id: Tab; label: string }[] = [
  { id: "cards", label: "Cartões" },
  { id: "bills", label: "Contas fixas" },
  { id: "pots", label: "Caixinha" },
  { id: "transactions", label: "Lançamentos" },
];

export default function FinancePage() {
  const [tab, setTab] = useState<Tab>("cards");
  // Any change bumps the version: every section and the overview fetch again
  const [version, setVersion] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const cards = useApiData(`cards:${version}`, financeRepository.listCards);

  /** Runs a change on the API and refreshes everything; false (with a message) if it failed. */
  async function change(action: () => Promise<unknown>): Promise<boolean> {
    setError(null);
    try {
      await action();
      setVersion((v) => v + 1);
      return true;
    } catch (e) {
      setError(getErrorMessage(e));
      return false;
    }
  }

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-4">
      <h1 className="text-2xl font-semibold">Finanças</h1>

      {(error ?? cards.error) && (
        <p className="rounded-lg border border-red-400/40 px-3 py-2 text-sm text-red-400">{error ?? cards.error}</p>
      )}

      <Overview version={version} onChange={change} />

      <nav className="flex flex-wrap gap-2" aria-label="Seções de Finanças">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            aria-pressed={tab === t.id}
            onClick={() => setTab(t.id)}
            className={[
              "rounded-full border px-4 py-1.5 text-sm font-medium transition-colors",
              tab === t.id
                ? "border-primary bg-primary text-bg"
                : "border-border text-muted hover:bg-surface-hover hover:text-text",
            ].join(" ")}
          >
            {t.label}
          </button>
        ))}
      </nav>

      {tab === "cards" && <CardsSection cards={cards.data ?? []} onChange={change} />}
      {tab === "bills" && <FixedBillsSection version={version} onChange={change} />}
      {tab === "pots" && <PotsSection version={version} onChange={change} />}
      {tab === "transactions" && (
        <TransactionsSection cards={cards.data ?? []} version={version} onChange={change} />
      )}
    </div>
  );
}
