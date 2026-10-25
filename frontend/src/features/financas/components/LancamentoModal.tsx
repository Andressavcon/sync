import { useState } from "react";
import { addMonths, format, isValid, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Trash2 } from "lucide-react";
import Button from "@/components/ui/Button";
import Checkbox from "@/components/ui/Checkbox";
import Field from "@/components/ui/Field";
import FormModal from "@/components/ui/FormModal";
import Input from "@/components/ui/Input";
import { parseBRL } from "@/lib/format";
import { fieldClass } from "@/lib/ui";
import { useFinancas } from "../hooks/useFinancas";
import { inicioDoMes, mesDe, sugerirFatura, vencimentoDe } from "../utils/faturas";
import { meioParaValor } from "../utils/meio";
import type { Escopo, Lancamento, MeioPagamento } from "../types";
import EscopoModal from "./EscopoModal";

interface Props {
  /** Sem lançamento = criando um novo */
  lancamento?: Lancamento;
  onClose: () => void;
}

export default function LancamentoModal({ lancamento, onClose }: Props) {
  const { cartoes, faturas, addLancamento, addCompraParcelada, updateLancamento, removeLancamento } = useFinancas();

  const ehParcela = !!lancamento?.parcela;
  const cartaoDoLancamento = lancamento?.meio.tipo === "cartao" ? lancamento.meio.cartaoId : null;
  const opcoesCartao = cartoes.filter((c) => !c.arquivado || c.id === cartaoDoLancamento);

  const [tipo, setTipo] = useState<"receita" | "despesa">(lancamento?.tipo ?? "despesa");
  const [titulo, setTitulo] = useState(lancamento?.titulo ?? "");
  const [valorTxt, setValorTxt] = useState(lancamento ? String(lancamento.valor).replace(".", ",") : "");
  const [data, setData] = useState(lancamento?.data ?? format(new Date(), "yyyy-MM-dd"));
  const [meio, setMeio] = useState(
    lancamento ? meioParaValor(lancamento.meio) : opcoesCartao[0] ? `cartao:${opcoesCartao[0].id}` : "pix"
  );
  const [parcelado, setParcelado] = useState(false);
  const [numParcelas, setNumParcelas] = useState("2");
  const [faturaManual, setFaturaManual] = useState<string | null>(lancamento?.faturaMes ?? null);
  const [contabilizar, setContabilizar] = useState(lancamento?.contabilizar ?? false);
  const [escopoPara, setEscopoPara] = useState<"salvar" | "excluir" | null>(null);

  const valor = parseBRL(valorTxt);
  const dataValida = isValid(parseISO(data));
  const cartao = meio.startsWith("cartao:") ? cartoes.find((c) => c.id === meio.slice(7)) : undefined;
  const noCartao = tipo === "despesa" && !!cartao;

  // fatura sugerida pela data da compra; dá para trocar
  const sugestao = cartao && dataValida ? sugerirFatura(cartao, parseISO(data), faturas) : null;
  const faturaMes = noCartao ? (faturaManual ?? sugestao ?? undefined) : undefined;
  const opcoesFatura =
    noCartao && sugestao
      ? Array.from(
          new Set([
            ...(faturaMes ? [faturaMes] : []),
            ...[-1, 0, 1, 2].map((k) => mesDe(addMonths(inicioDoMes(sugestao), k))),
          ])
        ).sort()
      : [];

  const parcelas = Number(numParcelas);
  const valido =
    titulo.trim() !== "" &&
    Number.isFinite(valor) &&
    valor > 0 &&
    dataValida &&
    (!parcelado || (Number.isInteger(parcelas) && parcelas >= 2 && parcelas <= 60));

  const meioFinal: MeioPagamento =
    tipo === "receita" ? { tipo: "pix" } : cartao ? { tipo: "cartao", cartaoId: cartao.id } : meio === "boleto" ? { tipo: "boleto" } : { tipo: "pix" };

  function salvar() {
    if (!valido) return;
    if (lancamento && ehParcela) {
      setEscopoPara("salvar"); // pergunta: só esta ou esta e as próximas
      return;
    }
    if (lancamento) {
      updateLancamento(
        lancamento.id,
        {
          tipo,
          titulo: titulo.trim(),
          valor,
          data,
          meio: meioFinal,
          faturaMes,
          contabilizar: tipo === "receita" ? contabilizar : undefined,
        },
        "esta"
      );
    } else if (parcelado && noCartao && cartao && faturaMes) {
      addCompraParcelada({
        titulo: titulo.trim(),
        valorParcela: valor,
        parcelas,
        data,
        cartaoId: cartao.id,
        faturaMes,
      });
    } else {
      addLancamento({
        tipo,
        titulo: titulo.trim(),
        valor,
        data,
        meio: meioFinal,
        faturaMes,
        contabilizar: tipo === "receita" ? contabilizar : undefined,
      });
    }
    onClose();
  }

  function excluir() {
    if (!lancamento) return;
    if (ehParcela) setEscopoPara("excluir");
    else if (window.confirm(`Excluir "${lancamento.titulo}"?`)) {
      removeLancamento(lancamento.id, "esta");
      onClose();
    }
  }

  function aplicarEscopo(escopo: Escopo) {
    if (!lancamento) return;
    if (escopoPara === "salvar") updateLancamento(lancamento.id, { titulo: titulo.trim(), valor }, escopo);
    else removeLancamento(lancamento.id, escopo);
    onClose();
  }

  if (escopoPara && lancamento) {
    return (
      <EscopoModal
        titulo={escopoPara === "salvar" ? "Salvar parcela" : "Excluir parcela"}
        onEscolher={aplicarEscopo}
        onClose={() => setEscopoPara(null)}
      />
    );
  }

  return (
    <FormModal
      titulo={lancamento ? "Editar lançamento" : "Novo lançamento"}
      onClose={onClose}
      rodape={
        <>
          {lancamento && (
            <Button variant="ghost" onClick={excluir}>
              <Trash2 size={16} /> Excluir
            </Button>
          )}
          <Button variant="secondary" className="ml-auto" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={salvar} disabled={!valido}>
            Salvar
          </Button>
        </>
      }
    >
      {lancamento?.parcela && (
        <p className="rounded-lg border border-border bg-bg p-3 text-sm text-muted">
          Parcela {lancamento.parcela.numero}/{lancamento.parcela.total}. Aqui dá para mudar o título e o valor; ao
          salvar, você escolhe se vale só para esta ou também para as próximas.
        </p>
      )}

      <div className="grid grid-cols-2 gap-2" role="group" aria-label="Tipo">
        {(["despesa", "receita"] as const).map((t) => (
          <button
            key={t}
            type="button"
            disabled={ehParcela}
            aria-pressed={tipo === t}
            onClick={() => setTipo(t)}
            className={[
              "rounded-lg border px-3 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60",
              tipo === t ? "border-primary bg-primary text-bg" : "border-border text-muted hover:bg-surface-hover",
            ].join(" ")}
          >
            {t === "despesa" ? "Despesa" : "Receita"}
          </button>
        ))}
      </div>

      <Field rotulo="Descrição">
        <Input value={titulo} onChange={(e) => setTitulo(e.target.value)} autoFocus={!lancamento} />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field rotulo={parcelado ? "Valor da parcela" : "Valor"}>
          <Input inputMode="decimal" placeholder="0,00" value={valorTxt} onChange={(e) => setValorTxt(e.target.value)} />
        </Field>
        <Field rotulo="Data">
          <Input
            type="date"
            value={data}
            disabled={ehParcela}
            onChange={(e) => {
              setData(e.target.value);
              setFaturaManual(null);
            }}
          />
        </Field>
      </div>

      {tipo === "despesa" && (
        <Field rotulo="Meio de pagamento">
          <select
            className={fieldClass}
            value={meio}
            disabled={ehParcela}
            onChange={(e) => {
              setMeio(e.target.value);
              setFaturaManual(null);
            }}
          >
            {opcoesCartao.map((c) => (
              <option key={c.id} value={`cartao:${c.id}`}>
                {c.nome}
              </option>
            ))}
            <option value="pix">Pix</option>
            <option value="boleto">Boleto</option>
          </select>
        </Field>
      )}

      {noCartao && cartao && !ehParcela && (
        <>
          <Field rotulo="Fatura" dica="Sugerida pela data da compra; você pode trocar.">
            <select className={fieldClass} value={faturaMes ?? ""} onChange={(e) => setFaturaManual(e.target.value)}>
              {opcoesFatura.map((m) => (
                <option key={m} value={m}>
                  {format(inicioDoMes(m), "MMM/yyyy", { locale: ptBR })} · vence {format(vencimentoDe(cartao, m), "dd/MM")}
                </option>
              ))}
            </select>
          </Field>

          {!lancamento && (
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2 text-sm">
                <Checkbox label="Compra parcelada" checked={parcelado} onChange={setParcelado} />
                <span>Compra parcelada</span>
              </div>
              {parcelado && (
                <Field rotulo="Número de parcelas">
                  <Input
                    className="w-28"
                    inputMode="numeric"
                    value={numParcelas}
                    onChange={(e) => setNumParcelas(e.target.value)}
                  />
                </Field>
              )}
            </div>
          )}
        </>
      )}

      {tipo === "receita" && (
        <div className="flex items-start gap-2 text-sm">
          <Checkbox label="Contabilizar no disponível" checked={contabilizar} onChange={setContabilizar} />
          <span>
            Contabilizar no disponível do ciclo
            <span className="block text-xs text-muted">
              Desmarcado, o valor fica de fora e dá para guardá-lo sem misturar com o salário.
            </span>
          </span>
        </div>
      )}
    </FormModal>
  );
}
