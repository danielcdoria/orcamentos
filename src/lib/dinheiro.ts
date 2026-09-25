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
