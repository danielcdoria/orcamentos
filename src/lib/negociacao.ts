import "server-only";
import { prisma } from "@/lib/prisma";
import { diasDesde } from "@/lib/cobranca";
import type { EtapaVenda, VezDe } from "@/generated/prisma/enums";
import { diferencaDias, hojeNoFuso } from "@/lib/dia";

// ============================================================================
// NEGOCIAÇÃO: o que acontece depois que o cliente responde (status "respondido").
// Cada negociação tem uma ETAPA (interessado → demonstração → proposta → negociando),
// um PRÓXIMO PASSO (o que precisa acontecer), uma DATA e DE QUEM É A VEZ (eu ou o cliente).
//
// A tela "Hoje" organiza tudo por data, para nenhuma conversa ser esquecida:
//   - "Para hoje": próximo passo com data de hoje ou já vencida
//   - "Sem próximo passo": respondeu, mas ninguém definiu o que vem depois
//   - "Você deve": a vez é sua, com data futura
//   - "Esperando o cliente": a vez é do cliente, com data futura
// O sistema NUNCA envia mensagem sozinho: ele só lembra.
// ============================================================================

export type Negociacao = {
  orcamentoId: string;
  numero: number;
  clienteId: string;
  cliente: string;
  telefone: string | null;
  cidade: string | null;
  linkDemo: string | null;
  observacaoCliente: string | null;
  etapa: EtapaVenda | null;
  proximoPasso: string | null;
  dia: string | null; // "2026-10-22" (dia do próximo passo, em Brasília)
  vezDe: VezDe;
  atraso: number; // dias de atraso (0 = hoje; negativo = futuro). Sem data: 0
  diasParado: number; // dias desde a última mudança (status ou próximo passo)
};

export type GruposHoje = {
  paraHoje: Negociacao[];
  semPasso: Negociacao[];
  euDevo: Negociacao[];
  esperando: Negociacao[];
};

export async function buscarNegociacoes(empresaId: string): Promise<Negociacao[]> {
  const lista = await prisma.orcamento.findMany({
    where: { empresaId, status: "respondido" },
    select: {
      id: true,
      numero: true,
      etapa: true,
      proximoPasso: true,
      proximoPassoEm: true,
      vezDe: true,
      statusAlteradoEm: true,
      retomadoEm: true,
      cliente: {
        select: { id: true, nome: true, telefone: true, cidade: true, linkDemo: true, observacao: true },
      },
    },
  });

  const hoje = hojeNoFuso();
  return lista.map((o) => {
    const ultima = [o.statusAlteradoEm, o.retomadoEm].filter((d): d is Date => d !== null);
    const maisRecente = new Date(Math.max(...ultima.map((d) => d.getTime())));
    const dia = o.proximoPassoEm ? hojeNoFuso(o.proximoPassoEm) : null;
    return {
      orcamentoId: o.id,
      numero: o.numero,
      clienteId: o.cliente.id,
      cliente: o.cliente.nome,
      telefone: o.cliente.telefone,
      cidade: o.cliente.cidade,
      linkDemo: o.cliente.linkDemo,
      observacaoCliente: o.cliente.observacao,
      etapa: o.etapa,
      proximoPasso: o.proximoPasso,
      dia,
      vezDe: o.vezDe ?? "cliente",
      atraso: dia ? diferencaDias(dia, hoje) : 0,
      diasParado: diasDesde(maisRecente),
    };
  });
}

export function agruparHoje(lista: Negociacao[]): GruposHoje {
  const porDia = (a: Negociacao, b: Negociacao) => (a.dia ?? "").localeCompare(b.dia ?? "");
  return {
    paraHoje: lista.filter((n) => n.dia && n.atraso >= 0).sort((a, b) => b.atraso - a.atraso),
    semPasso: lista.filter((n) => !n.dia).sort((a, b) => b.diasParado - a.diasParado),
    euDevo: lista.filter((n) => n.dia && n.atraso < 0 && n.vezDe === "eu").sort(porDia),
    esperando: lista.filter((n) => n.dia && n.atraso < 0 && n.vezDe === "cliente").sort(porDia),
  };
}

// Número da bolinha de "Hoje": próximos passos de hoje ou atrasados. (Quem está sem próximo
// passo aparece na tela "Hoje" e, depois de alguns dias, em "Retomar conversa" de Cobrar hoje.)
export async function contarHoje(empresaId: string): Promise<number> {
  return agruparHoje(await buscarNegociacoes(empresaId)).paraHoje.length;
}
