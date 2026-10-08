"use server";

import { revalidatePath } from "next/cache";
import { exigirSessao } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { STATUS_AGUARDANDO } from "@/lib/status";

// Chamado quando a pessoa toca em "Já cobrei" na tela Cobrar hoje (ela mesma escreveu a
// mensagem no WhatsApp). Registra a cobrança (é uma só, etapa 1), para o orçamento sair da
// fila e o prazo de "perdido" começar a contar. Devolve o id da cobrança, para o "Desfazer".
export async function registrarCobranca(orcamentoId: string): Promise<string | null> {
  const { empresaId } = await exigirSessao();
  const etapa = 1;

  const orcamento = await prisma.orcamento.findFirst({
    where: { id: orcamentoId, empresaId, status: { in: STATUS_AGUARDANDO } },
    select: { id: true },
  });
  if (!orcamento) return null;

  await prisma.cobranca.createMany({
    data: [{ empresaId, orcamentoId, etapa }], // sem mensagem: foi escrita à mão no WhatsApp
    skipDuplicates: true, // tocou duas vezes? registra uma só
  });
  const cobranca = await prisma.cobranca.findFirst({
    where: { orcamentoId, etapa, empresaId },
    select: { id: true },
  });

  atualizarTelas(orcamentoId);
  return cobranca?.id ?? null;
}

// "Desfazer" logo depois do "Já cobrei" (tocou na pousada errada): apaga aquela cobrança e o
// orçamento volta para a fila. Só apaga se for desta empresa, recente e sem mensagem, ou seja,
// uma cobrança que acabou de ser feita pelo "Já cobrei", nunca uma antiga.
const JANELA_DESFAZER_MS = 10 * 60 * 1000;

export async function desfazerCobranca(cobrancaId: string) {
  const { empresaId } = await exigirSessao();
  const cobranca = await prisma.cobranca.findFirst({
    where: { id: cobrancaId, empresaId },
    select: { orcamentoId: true },
  });
  if (!cobranca) return;

  await prisma.cobranca.deleteMany({
    where: {
      id: cobrancaId,
      empresaId,
      mensagem: null,
      enviadaEm: { gte: new Date(Date.now() - JANELA_DESFAZER_MS) },
    },
  });
  atualizarTelas(cobranca.orcamentoId);
}

function atualizarTelas(orcamentoId: string) {
  revalidatePath("/cobrar");
  revalidatePath("/orcamentos");
  revalidatePath(`/orcamentos/${orcamentoId}`);
}

// "Marcar como respondido": tira da fila de cobrança.
export async function marcarRespondido(orcamentoId: string) {
  const { empresaId } = await exigirSessao();
  await prisma.orcamento.updateMany({
    where: { id: orcamentoId, empresaId },
    data: { status: "respondido" },
  });
  atualizarTelas(orcamentoId);
}
