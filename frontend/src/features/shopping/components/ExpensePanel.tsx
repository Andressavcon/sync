import { Wallet } from "lucide-react";
import Card from "@/components/ui/Card";

/**
 * Register the market total as an expense in Finance (section 8.4).
 * Placeholder until the Finance module is connected to the API.
 */
export default function ExpensePanel() {
  return (
    <Card title="Registrar gasto" description="Informe só o total pago, ao sair do mercado.">
      <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-border px-4 py-6 text-center">
        <Wallet size={24} className="text-muted" />
        <p className="text-sm text-muted">
          Disponível quando o módulo Finanças estiver ligado ao servidor. O gasto vai virar uma
          despesa lá, entrando na fatura se for no cartão.
        </p>
      </div>
    </Card>
  );
}
