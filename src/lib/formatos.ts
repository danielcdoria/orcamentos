// Formatação de datas e quantidades para mostrar na tela, sempre no fuso de Brasília.

const data = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  timeZone: "America/Sao_Paulo",
});

const dataHora = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "America/Sao_Paulo",
});

// 25/09/2026
export function formatarData(d: Date): string {
  return data.format(d);
}

// 25/09, 14:30
export function formatarDataHora(d: Date): string {
  return dataHora.format(d);
}

// Decimal do banco (2.500) -> "2,5"
export function formatarQuantidade(q: { toString(): string }): string {
  return String(Number(q.toString())).replace(".", ",");
}
