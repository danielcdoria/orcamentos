import "server-only";
import { prisma } from "@/lib/prisma";
import { STATUS_AGUARDANDO } from "@/lib/status";

// ============================================================================
// A REGRA DE COBRANÇA (uma cobrança só), enquanto o status for "enviado" ou "aberto":
//   - prazoCobranca1 dias depois do ENVIO (enviadoEm): entra em "Cobrar hoje" e fica lá
//     até a pessoa tocar em "Já cobrei" (ou marcar que o cliente respondeu)
//   - prazoPerdido dias depois da COBRANÇA, sem resposta: vira "perdido"
// Quem ainda não foi cobrado nunca vira perdido sozinho: primeiro precisa da cobrança.
// Os prazos vêm dos Ajustes da empresa. (prazoCobranca2 ficou no banco, mas não é mais usado.)
//
// Não existe um "relógio" rodando: a regra é aplicada toda vez que alguém abre o
// sistema. Mesmo que ninguém entre por uma semana, ao entrar tudo aparece certo.
//
// O sistema NUNCA envia mensagem sozinho. Ele só decide quem cobrar; a pessoa escreve a
// mensagem no WhatsApp e toca em "Já cobrei".
// ============================================================================

const FUSO = "America/Sao_Paulo";
const diaNoFuso = new Intl.DateTimeFormat("en-CA", { timeZone: FUSO }); // "2026-09-26"

// Dias de calendário (em Brasília) entre duas datas. Enviado ontem às 23h = 1 dia hoje.
export function diasDesde(data: Date, agora = new Date()): number {
  const inicio = Date.parse(diaNoFuso.format(data));
  const fim = Date.parse(diaNoFuso.format(agora));
  return Math.round((fim - inicio) / 86_400_000);
}

// A cobrança está devida hoje? Só se ainda não foi feita e já passou o prazo desde o envio.
// (Orçamentos antigos podem ter cobranças de etapa 1 e 2; qualquer uma conta como "já cobrado".)
export function cobrancaDevida(diasDesdeEnvio: number, jaCobrado: boolean, prazoCobranca: number): boolean {
  return !jaCobrado && diasDesdeEnvio >= prazoCobranca;
}

// Marca como "perdido" quem foi cobrado e, passado o prazo desde a cobrança, não respondeu.
// Conta a partir da cobrança mais recente. Devolve quantos foram marcados.
export async function marcarPerdidosVencidos(empresaId: string, prazoPerdido: number) {
  const cobrados = await prisma.orcamento.findMany({
    where: { empresaId, status: { in: STATUS_AGUARDANDO }, cobrancas: { some: {} } },
    select: { id: true, cobrancas: { orderBy: { enviadaEm: "desc" }, take: 1, select: { enviadaEm: true } } },
  });
  const vencidos = cobrados
    .filter((o) => diasDesde(o.cobrancas[0].enviadaEm) >= prazoPerdido)
    .map((o) => o.id);
  if (vencidos.length === 0) return 0;

  const { count } = await prisma.orcamento.updateMany({
    // repete o filtro de status: se alguém marcou "respondido" nesse meio-tempo, não mexe
    where: { id: { in: vencidos }, empresaId, status: { in: STATUS_AGUARDANDO } },
    data: { status: "perdido" },
  });
  return count;
}

export type ItemFila = {
  orcamentoId: string;
  numero: number;
  cliente: string;
  telefone: string | null;
  total: number;
  dias: number; // há quantos dias foi enviado
  // O cliente mexeu nas opções do orçamento (e não respondeu): sinal de dúvida de preço
  mexeuNasOpcoes: { vezes: number; dias: number; resumo: string } | null;
};

// Quem está com cobrança devida hoje (a decisão, sem montar mensagens).
// Usada tanto pela tela "Cobrar hoje" quanto pelo aviso da lista, para os dois baterem.
async function orcamentosDevidos(empresaId: string) {
  const empresa = await prisma.empresa.findUniqueOrThrow({ where: { id: empresaId } });
  await marcarPerdidosVencidos(empresaId, empresa.prazoPerdido);

  const candidatos = await prisma.orcamento.findMany({
    where: { empresaId, status: { in: STATUS_AGUARDANDO }, enviadoEm: { not: null } },
    include: {
      cliente: { select: { nome: true, telefone: true } },
      _count: { select: { escolhas: true, cobrancas: true } },
      escolhas: { orderBy: { criadaEm: "desc" }, take: 1, select: { criadaEm: true, resumo: true } },
    },
  });

  const devidos = [];
  for (const o of candidatos) {
    const dias = diasDesde(o.enviadoEm!);
    if (cobrancaDevida(dias, o._count.cobrancas > 0, empresa.prazoCobranca1)) devidos.push({ o, dias });
  }
  return { empresa, devidos };
}

// Quantos orçamentos esperam cobrança hoje (para o aviso no topo da lista).
export async function contarFila(empresaId: string): Promise<number> {
  const { devidos } = await orcamentosDevidos(empresaId);
  return devidos.length;
}

// A fila de "Cobrar hoje": quem precisa ser cobrado hoje.
// (Os modelos de mensagem da empresa não são mais usados: cada conversa é escrita à mão.)
export async function buscarFila(empresaId: string): Promise<ItemFila[]> {
  const { devidos } = await orcamentosDevidos(empresaId);

  const fila: ItemFila[] = devidos.map(({ o, dias }) => ({
    orcamentoId: o.id,
    numero: o.numero,
    cliente: o.cliente.nome,
    telefone: o.cliente.telefone,
    total: o.total,
    dias,
    mexeuNasOpcoes: o.escolhas[0]
      ? { vezes: o._count.escolhas, dias: diasDesde(o.escolhas[0].criadaEm), resumo: o.escolhas[0].resumo }
      : null,
  }));

  // Os mais antigos primeiro (dinheiro mais perto de esfriar)
  return fila.sort((a, b) => b.dias - a.dias);
}
