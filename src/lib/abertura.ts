import "server-only";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { lerSessao } from "@/lib/sessao";

// Registro de "o cliente abriu o orçamento".
// O difícil aqui é NÃO contar aberturas falsas:
// - robôs de prévia de link (o WhatsApp visita a página para montar o cartãozinho
//   assim que o link é enviado, antes de o cliente tocar nele);
// - o próprio dono da empresa conferindo o link enquanto está logado;
// - pré-carregamentos automáticos do navegador.

const ROBOS =
  /bot|crawl|spider|preview|facebookexternalhit|whatsapp|telegram|slack|discord|skype|curl|wget|python|headless/i;

// Decide, a partir do pedido atual, se esta visita conta como abertura do cliente.
export async function visitaContaComoAbertura(empresaId: string): Promise<boolean> {
  const h = await headers();
  const agente = h.get("user-agent") ?? "";
  if (!agente || ROBOS.test(agente)) return false;

  const proposito = `${h.get("purpose") ?? ""} ${h.get("sec-purpose") ?? ""}`;
  if (proposito.includes("prefetch") || h.get("next-router-prefetch")) return false;

  const sessao = await lerSessao();
  if (sessao?.empresaId === empresaId) return false; // é a própria empresa olhando

  return true;
}

export async function registrarAbertura(orcamentoId: string) {
  const agora = new Date();
  await prisma.$transaction([
    prisma.orcamento.update({
      where: { id: orcamentoId },
      data: { vezesAberto: { increment: 1 } },
    }),
    // Só grava a data se ainda estiver vazia: guardamos a PRIMEIRA abertura.
    prisma.orcamento.updateMany({
      where: { id: orcamentoId, abertoEm: null },
      data: { abertoEm: agora },
    }),
  ]);
}
