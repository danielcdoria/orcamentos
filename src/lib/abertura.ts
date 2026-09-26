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

// Atualizar a página várias vezes seguidas não deve inflar o contador.
// Só conta uma "vez" nova se a última abertura foi há mais de 30 minutos.
const INTERVALO_MS = 30 * 60 * 1000;

export async function registrarAbertura(orcamentoId: string) {
  const agora = new Date();
  const limite = new Date(agora.getTime() - INTERVALO_MS);

  // As 3 operações rodam em ordem, juntas.
  await prisma.$transaction([
    // 1. soma +1 só se nunca abriu ou se a última abertura foi antes do limite
    prisma.orcamento.updateMany({
      where: {
        id: orcamentoId,
        OR: [{ ultimaAberturaEm: null }, { ultimaAberturaEm: { lt: limite } }],
      },
      data: { vezesAberto: { increment: 1 } },
    }),
    // 2. anota esta abertura como a mais recente
    prisma.orcamento.update({
      where: { id: orcamentoId },
      data: { ultimaAberturaEm: agora },
    }),
    // 3. só grava a data se ainda estiver vazia: guardamos a PRIMEIRA abertura
    prisma.orcamento.updateMany({
      where: { id: orcamentoId, abertoEm: null },
      data: { abertoEm: agora },
    }),
    // 4. se ainda era rascunho, o link foi mandado por outro caminho (ex.: "Copiar link"):
    //    consideramos enviado agora, para entrar na regra de cobrança
    prisma.orcamento.updateMany({
      where: { id: orcamentoId, status: "rascunho", enviadoEm: null },
      data: { enviadoEm: agora },
    }),
    // 5. status "aberto" automático (só a partir de rascunho/enviado; nunca desfaz
    //    respondido, fechado ou perdido)
    prisma.orcamento.updateMany({
      where: { id: orcamentoId, status: { in: ["rascunho", "enviado"] } },
      data: { status: "aberto" },
    }),
  ]);
}
