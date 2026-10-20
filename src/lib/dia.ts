// DIAS DE CALENDÁRIO em Brasília, como texto "2026-10-22".
// Usado pelo próximo passo das negociações: o que importa é o DIA, não a hora.
// No banco, o dia é gravado ao meio-dia de Brasília (15:00 UTC), longe da meia-noite,
// para nunca "escorregar" para o dia anterior ou seguinte por causa do fuso.
// Roda no servidor e no navegador.

const FUSO = "America/Sao_Paulo";
const formatoDia = new Intl.DateTimeFormat("en-CA", { timeZone: FUSO }); // "2026-10-22"
const formatoSemana = new Intl.DateTimeFormat("pt-BR", { weekday: "short", timeZone: FUSO });
const formatoDiaMes = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", timeZone: FUSO });

const DIA_VALIDO = /^\d{4}-\d{2}-\d{2}$/;

// O dia de hoje (ou de uma data qualquer) em Brasília: "2026-10-22"
export function hojeNoFuso(data: Date = new Date()): string {
  return formatoDia.format(data);
}

// "2026-10-22" -> Date ao meio-dia de Brasília (confira antes com diaValido)
export function diaParaData(dia: string): Date {
  return new Date(`${dia}T15:00:00Z`);
}

export function diaValido(dia: string): boolean {
  if (!DIA_VALIDO.test(dia)) return false;
  const d = diaParaData(dia);
  return !Number.isNaN(d.getTime()) && hojeNoFuso(d) === dia;
}

// "2026-10-22" + 3 -> "2026-10-25"
export function somarDias(dia: string, n: number): string {
  return hojeNoFuso(new Date(diaParaData(dia).getTime() + n * 86_400_000));
}

// Diferença em dias entre dois dias ("b" menos "a")
export function diferencaDias(a: string, b: string): number {
  return Math.round((diaParaData(b).getTime() - diaParaData(a).getTime()) / 86_400_000);
}

// Texto curto do dia, a partir de hoje: "hoje", "amanhã", "ontem", "qui 22/10"
export function textoDia(dia: string, hoje: string = hojeNoFuso()): string {
  const dif = diferencaDias(hoje, dia);
  if (dif === 0) return "hoje";
  if (dif === 1) return "amanhã";
  if (dif === -1) return "ontem";
  const d = diaParaData(dia);
  return `${formatoSemana.format(d).replace(".", "")} ${formatoDiaMes.format(d)}`;
}
