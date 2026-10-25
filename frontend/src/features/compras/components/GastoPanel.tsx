import { useState, type FormEvent } from "react";
import { format } from "date-fns";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import { formatBRL, parseBRL } from "@/lib/format";
import { fieldClass } from "@/lib/ui";
import { useCompras } from "../hooks/useCompras";
import { MEIOS_PAGAMENTO } from "../mock";

export default function GastoPanel() {
  const registrarGasto = useCompras((s) => s.registrarGasto);
  const [titulo, setTitulo] = useState("SUPERMERCADO");
  const [valorTxt, setValorTxt] = useState("");
  const [meio, setMeio] = useState<string>(MEIOS_PAGAMENTO[0]);
  const [data, setData] = useState(() => format(new Date(), "yyyy-MM-dd"));
  const [aviso, setAviso] = useState("");

  const valor = parseBRL(valorTxt);
  const valido = titulo.trim() !== "" && Number.isFinite(valor) && valor > 0;

  function enviar(e: FormEvent) {
    e.preventDefault();
    if (!valido) return;
    registrarGasto({ titulo: titulo.trim(), valor, meio, data });
    setAviso(`Gasto de ${formatBRL(valor)} registrado.`);
    setValorTxt("");
  }

  return (
    <Card
      title="Registrar gasto"
      description="Informe só o total pago, ao sair do mercado."
    >
      <form onSubmit={enviar} className="flex flex-col gap-3">
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium">Título</span>
          <Input value={titulo} onChange={(e) => setTitulo(e.target.value)} />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium">Valor total</span>
          <Input
            inputMode="decimal"
            placeholder="0,00"
            value={valorTxt}
            onChange={(e) => {
              setValorTxt(e.target.value);
              setAviso("");
            }}
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium">Pagamento</span>
          <select className={fieldClass} value={meio} onChange={(e) => setMeio(e.target.value)}>
            {MEIOS_PAGAMENTO.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium">Data</span>
          <Input type="date" value={data} onChange={(e) => setData(e.target.value)} />
        </label>

        <Button type="submit" disabled={!valido}>
          Registrar gasto
        </Button>

        {aviso && <p className="text-sm text-primary">{aviso}</p>}
        <p className="text-xs text-muted">
          Por enquanto o gasto fica só guardado aqui. Com Finanças pronto, ele vira uma despesa lá.
          Registrar não conclui a lista.
        </p>
      </form>
    </Card>
  );
}
