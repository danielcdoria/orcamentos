import "server-only";
import { prisma } from "@/lib/prisma";
import { formatarCentavos } from "@/lib/dinheiro";
import { formatarData } from "@/lib/formatos";
import { montarMensagem } from "@/lib/mensagem";
import { STATUS_AGUARDANDO } from "@/lib/status";

// ============================================================================
// A REGRA DE COBRANÇA
// Conta os dias desde o envio (enviadoEm), enquanto o status for "enviado" ou "aberto":
//   - a partir de prazoCobranca1 dias: 1ª cobrança
//   - a partir de prazoCobranca2 dias: 2ª cobrança
//   - a partir de prazoPerdido dias:   vira "perdido" e sai da fila
// Os prazos vêm das Configurações da empresa.
//
// Não existe um "relógio" rodando: a regra é aplicada toda vez que alguém abre o
// sistema. Mesmo que ninguém entre por uma semana, ao entrar tudo aparece certo.
//
// O sistema NUNCA envia mensagem sozinho. Ele só decide quem cobrar e escreve o texto.
// ============================================================================

const FUSO = "America/Sao_Paulo";
const diaNoFuso = new Intl.DateTimeFormat("en-CA", { timeZone: FUSO }); // "2026-09-26"

// Dias de calendário (em Brasília) entre duas datas. Enviado ontem às 23h = 1 dia hoje.
export function diasDesde(data: Date, agora = new Date()): number {
  const inicio = Date.parse(diaNoFuso.format(data));
  const fim = Date.parse(diaNoFuso.format(agora));
  return Math.round((fim - inicio) / 86_400_000);
}

type Prazos = { prazoCobranca1: number; prazoCobranca2: number; prazoPerdido: number };

// Qual cobrança está "vencida" hoje. Se a pessoa pulou a 1ª e já passou do prazo da 2ª,
// mostra direto a 2ª (não faz sentido mandar as duas no mesmo dia).
export function etapaDevida(dias: number, etapasFeitas: number[], p: Prazos): 1 | 2 | null {
  if (dias >= p.prazoPerdido) return null;
  if (dias >= p.prazoCobranca2) return etapasFeitas.includes(2) ? null : 2;
  if (dias >= p.prazoCobranca1) return etapasFeitas.includes(1) ? null : 1;
  return null;
}

// Marca como "perdido" quem passou do prazo sem responder. Devolve quantos foram marcados.
export async function marcarPerdidosVencidos(empresaId: string, prazoPerdido: number) {
  const aguardando = await prisma.orcamento.findMany({
    where: { empresaId, status: { in: STATUS_AGUARDANDO }, enviadoEm: { not: null } },
    select: { id: true, enviadoEm: true },
  });
  const vencidos = aguardando.filter((o) => diasDesde(o.enviadoEm!) >= prazoPerdido).map((o) => o.id);
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
  abriu: boolean;
  etapa: 1 | 2;
  mensagem: string; // já montada a partir do modelo certo
};

// A fila de "Cobrar hoje": quem precisa ser cobrado, com a mensagem pronta.
// linkDoOrcamento monta o link público a partir do token (o endereço depende do site).
export async function buscarFila(
  empresaId: string,
  linkDoOrcamento: (token: string) => string,
): Promise<ItemFila[]> {
  const empresa = await prisma.empresa.findUniqueOrThrow({ where: { id: empresaId } });
  await marcarPerdidosVencidos(empresaId, empresa.prazoPerdido);

  const candidatos = await prisma.orcamento.findMany({
    where: { empresaId, status: { in: STATUS_AGUARDANDO }, enviadoEm: { not: null } },
    include: {
      cliente: { select: { nome: true, telefone: true } },
      cobrancas: { select: { etapa: true } },
    },
  });

  const fila: ItemFila[] = [];
  for (const o of candidatos) {
    const dias = diasDesde(o.enviadoEm!);
    const etapa = etapaDevida(dias, o.cobrancas.map((c) => c.etapa), empresa);
    if (!etapa) continue;

    const abriu = o.abertoEm !== null;
    const modelo =
      etapa === 1
        ? abriu ? empresa.msgCobranca1Abriu : empresa.msgCobranca1NaoAbriu
        : abriu ? empresa.msgCobranca2Abriu : empresa.msgCobranca2NaoAbriu;

    fila.push({
      orcamentoId: o.id,
      numero: o.numero,
      cliente: o.cliente.nome,
      telefone: o.cliente.telefone,
      total: o.total,
      dias,
      abriu,
      etapa,
      mensagem: montarMensagem(modelo, {
        cliente: o.cliente.nome,
        empresa: empresa.nome,
        valor: formatarCentavos(o.total),
        link: linkDoOrcamento(o.token),
        validade: formatarData(o.validoAte),
        numero: String(o.numero),
      }),
    });
  }

  // Os mais antigos primeiro (dinheiro mais perto de esfriar)
  return fila.sort((a, b) => b.dias - a.dias);
}
