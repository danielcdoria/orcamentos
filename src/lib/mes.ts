// Início e fim do mês atual no horário de Brasília (sem horário de verão desde 2019: UTC-3).

const partes = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/Sao_Paulo",
  year: "numeric",
  month: "numeric",
});

const nomeMes = new Intl.DateTimeFormat("pt-BR", {
  timeZone: "America/Sao_Paulo",
  month: "long",
  year: "numeric",
});

export function mesAtual(agora = new Date()) {
  const p = Object.fromEntries(partes.formatToParts(agora).map((x) => [x.type, x.value]));
  const ano = Number(p.year);
  const mes = Number(p.month); // 1 a 12
  return {
    inicio: new Date(Date.UTC(ano, mes - 1, 1, 3)), // dia 1, 00:00 em Brasília
    fim: new Date(Date.UTC(ano, mes, 1, 3)), // dia 1 do mês seguinte
    nome: nomeMes.format(agora), // "setembro de 2026"
  };
}
