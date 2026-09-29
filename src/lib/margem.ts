// CUSTO, LUCRO E MARGEM de um orçamento. INFORMAÇÃO INTERNA: só aparece para a empresa
// (montar orçamento e tela interna). Nunca na página pública nem no PDF.
import { calcularSubtotal } from "@/lib/dinheiro";

export type LinhaMargem = {
  quantidade: number;
  subtotal: number; // venda da linha, em centavos
  custoUnitario: number | null; // custo por unidade, em centavos (null = não informado)
};

export type ResumoMargem = {
  temCusto: boolean; // algum item tem custo? se não, o bloco não aparece
  custoTotal: number; // centavos
  lucro: number; // centavos (venda - custo)
  margem: number; // % do valor de venda (lucro ÷ venda × 100)
  itensSemCusto: number; // itens sem custo informado (entram como custo zero)
};

export function calcularMargem(linhas: LinhaMargem[]): ResumoMargem {
  const venda = linhas.reduce((s, l) => s + l.subtotal, 0);
  const comCusto = linhas.filter((l) => l.custoUnitario !== null);
  const custoTotal = comCusto.reduce((s, l) => s + calcularSubtotal(l.quantidade, l.custoUnitario!), 0);
  const lucro = venda - custoTotal;
  return {
    temCusto: comCusto.length > 0,
    custoTotal,
    lucro,
    margem: venda > 0 ? (lucro / venda) * 100 : 0,
    itensSemCusto: linhas.length - comCusto.length,
  };
}

// Verde acima de 30%, amarelo de 15% a 30%, vermelho abaixo de 15%.
export function faixaMargem(margem: number): "boa" | "atencao" | "baixa" {
  if (margem > 30) return "boa";
  if (margem >= 15) return "atencao";
  return "baixa";
}
