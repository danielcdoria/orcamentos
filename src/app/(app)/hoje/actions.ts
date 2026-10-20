"use server";

import { revalidatePath } from "next/cache";
import { exigirSessao } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { diaParaData, diaValido } from "@/lib/dia";
import { LISTA_ETAPAS, LISTA_VEZ, MAX_PROXIMO_PASSO } from "@/lib/etapas";
import type { EtapaVenda, VezDe } from "@/generated/prisma/enums";

export type DadosProximoPasso = {
  etapa: EtapaVenda | null;
  proximoPasso: string;
  dia: string; // "2026-10-22" ou "" (sem data)
  vezDe: VezDe;
};

// Grava a etapa e o próximo passo de uma negociação. Só mexe em orçamento da empresa logada.
// Devolve uma mensagem de erro, ou null se deu certo.
export async function salvarProximoPasso(orcamentoId: string, dados: DadosProximoPasso): Promise<string | null> {
  const { empresaId } = await exigirSessao();

  const etapa = dados.etapa && LISTA_ETAPAS.includes(dados.etapa) ? dados.etapa : null;
  const vezDe = LISTA_VEZ.includes(dados.vezDe) ? dados.vezDe : "cliente";
  const passo = String(dados.proximoPasso ?? "").trim().slice(0, MAX_PROXIMO_PASSO);
  const dia = String(dados.dia ?? "").trim();
  if (dia && !diaValido(dia)) return "Data inválida.";
  if (dia && !passo) return "Escreva qual é o próximo passo.";

  const { count } = await prisma.orcamento.updateMany({
    where: { id: orcamentoId, empresaId },
    data: {
      etapa,
      proximoPasso: passo || null,
      proximoPassoEm: dia ? diaParaData(dia) : null,
      vezDe,
      // Conta como movimento da conversa: "Retomar conversa" volta a contar daqui
      retomadoEm: new Date(),
    },
  });
  if (count === 0) return "Orçamento não encontrado.";

  atualizarTelas(orcamentoId);
  return null;
}

// Fechado ou Perdido direto da tela "Hoje": a negociação sai das listas.
export async function encerrarNegociacao(orcamentoId: string, status: "fechado" | "perdido") {
  const { empresaId } = await exigirSessao();
  if (status !== "fechado" && status !== "perdido") return;
  await prisma.orcamento.updateMany({
    where: { id: orcamentoId, empresaId },
    data: { status, statusAlteradoEm: new Date() },
  });
  atualizarTelas(orcamentoId);
}

function atualizarTelas(orcamentoId: string) {
  revalidatePath("/hoje");
  revalidatePath("/funil");
  revalidatePath("/cobrar");
  revalidatePath("/orcamentos");
  revalidatePath(`/orcamentos/${orcamentoId}`);
}
