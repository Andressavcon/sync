import { addDays, format } from "date-fns";
import { newId } from "@/lib/ids";
import type { Cartao, DadosFinancas, Lancamento } from "./types";
import { gerarParcelas } from "./utils/parcelas";
import { sugerirFatura } from "./utils/faturas";

export function gerarMock(): DadosFinancas {
  const hoje = new Date();
  const dia = (offset: number) => format(addDays(hoje, offset), "yyyy-MM-dd");

  const cartoes: Cartao[] = [
    { id: "c-nubank", nome: "Nubank", diaVencimento: 15, diaFechamento: 8, arquivado: false },
    { id: "c-bb", nome: "Banco do Brasil", diaVencimento: 5, diaFechamento: 25, arquivado: false },
    { id: "c-banrisul", nome: "Banrisul", diaVencimento: 10, diaFechamento: 3, arquivado: false },
    { id: "c-mp", nome: "Mercado Pago", diaVencimento: 20, diaFechamento: 12, arquivado: false },
  ];
  const fatura = (cartaoId: string, offset: number) =>
    sugerirFatura(cartoes.find((c) => c.id === cartaoId)!, addDays(hoje, offset), []);

  const noCartao = (titulo: string, valor: number, offset: number, cartaoId: string): Lancamento => ({
    id: newId(),
    tipo: "despesa",
    titulo,
    valor,
    data: dia(offset),
    meio: { tipo: "cartao", cartaoId },
    faturaMes: fatura(cartaoId, offset),
  });

  // TV em 10x de R$ 150, comprada há 60 dias
  const tv: Lancamento[] = gerarParcelas({
    titulo: "TV",
    valorParcela: 150,
    parcelas: 10,
    data: dia(-60),
    cartaoId: "c-banrisul",
    faturaMes: fatura("c-banrisul", -60),
  }).map((p) => ({ ...p, id: newId() }));

  const lancamentos: Lancamento[] = [
    noCartao("SUPERMERCADO", 187.45, -3, "c-nubank"),
    noCartao("Farmácia", 64.9, -6, "c-mp"),
    noCartao("Combustível", 210, -2, "c-bb"),
    ...tv,
    { id: newId(), tipo: "despesa", titulo: "Internet", valor: 99.9, data: dia(-5), meio: { tipo: "boleto" } },
    { id: newId(), tipo: "despesa", titulo: "Presente", valor: 80, data: dia(-1), meio: { tipo: "pix" } },
    {
      id: newId(),
      tipo: "receita",
      titulo: "Freelance",
      valor: 600,
      data: dia(-8),
      meio: { tipo: "pix" },
      contabilizar: false,
    },
  ];

  const potes = [
    { id: "p-viagem", nome: "Viagem", valor: 1200 },
    { id: "p-emergencia", nome: "Emergência", valor: 3000 },
    { id: "p-reserva", nome: "Reserva", valor: 800 },
  ];

  return {
    cartoes,
    faturas: [],
    lancamentos,
    contasFixas: [
      { id: "cf-aluguel", nome: "Aluguel", valor: 1200, diaVencimento: 5 },
      { id: "cf-condominio", nome: "Condomínio", valor: 350, diaVencimento: 5 },
      { id: "cf-gas", nome: "Gás", valor: 90, diaVencimento: 10 },
      { id: "cf-celular", nome: "Celular", valor: 60, diaVencimento: 15 },
    ],
    contasMes: [],
    potes,
    movimentos: [{ id: newId(), poteId: "p-viagem", tipo: "guardar", valor: 200, data: dia(-4) }],
    salario: { valor: 4500, dia: 5 },
  };
}
