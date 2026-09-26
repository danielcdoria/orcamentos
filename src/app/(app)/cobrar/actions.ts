"use server";

import { revalidatePath } from "next/cache";
import { exigirSessao } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { STATUS_AGUARDANDO } from "@/lib/status";

// Chamado quando a pessoa toca em "Enviar no WhatsApp" na tela Cobrar hoje.
// Registra que aquela etapa foi cobrada, para o orçamento sair da fila e não aparecer
// de novo. (Quem envia a mensagem de verdade é a pessoa, no WhatsApp.)
export async function registrarCobranca(orcamentoId: string, etapa: number, mensagem: string) {
  const { empresaId } = await exigirSessao();
  if (etapa !== 1 && etapa !== 2) return;

  const orcamento = await prisma.orcamento.findFirst({
    where: { id: orcamentoId, empresaId, status: { in: STATUS_AGUARDANDO } },
    select: { id: true },
  });
  if (!orcamento) return;

  await prisma.cobranca.createMany({
    data: [{ empresaId, orcamentoId, etapa, mensagem: String(mensagem).slice(0, 2000) }],
    skipDuplicates: true, // tocou duas vezes? registra uma só
  });

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
  revalidatePath("/cobrar");
  revalidatePath("/orcamentos");
  revalidatePath(`/orcamentos/${orcamentoId}`);
}
