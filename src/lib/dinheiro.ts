// Funções de dinheiro. Todo valor no sistema é guardado em CENTAVOS (número inteiro).

const formatador = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

// 1250 -> "R$ 12,50"
export function formatarCentavos(centavos: number): string {
  return formatador.format(centavos / 100);
}

// "12,50" / "12.50" / "R$ 1.234,56" -> 1250 / 1250 / 123456
// Devolve null se o texto não for um valor válido.
export function lerReais(texto: string): number | null {
  let limpo = texto.replace(/R\$|\s/g, "");
  if (limpo.includes(",")) {
    // formato brasileiro: ponto separa milhar, vírgula separa centavos
    limpo = limpo.replace(/\./g, "").replace(",", ".");
  }
  if (!/^\d+(\.\d{1,2})?$/.test(limpo)) return null;
  const [inteiro, decimal = ""] = limpo.split(".");
  return Number(inteiro) * 100 + Number(decimal.padEnd(2, "0"));
}

// Subtotal de uma linha: quantidade × preço, arredondado para o centavo mais próximo.
// Ex.: 2,5 × R$ 33,33 -> 8332,5 centavos -> 8333 centavos
export function calcularSubtotal(quantidade: number, precoUnitarioCentavos: number): number {
  return Math.round(quantidade * precoUnitarioCentavos);
}

// 1250 -> "12,50" (sem "R$"; usado para preencher campos de edição)
export function centavosParaTexto(centavos: number): string {
  return (centavos / 100).toFixed(2).replace(".", ",");
}

// "2,5" / "2.5" / "10" -> 2.5 / 2.5 / 10. Aceita até 3 casas decimais.
// Devolve null se o texto não for uma quantidade válida (maior que zero).
export function lerQuantidade(texto: string): number | null {
  const limpo = texto.trim().replace(",", ".");
  if (!/^\d+(\.\d{1,3})?$/.test(limpo)) return null;
  const valor = Number(limpo);
  return valor > 0 ? valor : null;
}

// Maior valor aceito num preço, subtotal ou total: R$ 20.000.000,00.
// O banco guarda centavos num número inteiro que vai até ~R$ 21,4 milhões; acima disso
// daria erro ao salvar. Para pequenas empresas é folga de sobra.
export const VALOR_MAXIMO = 20_000_000_00;
