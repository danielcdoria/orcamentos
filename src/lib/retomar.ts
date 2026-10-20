import "server-only";
import { prisma } from "@/lib/prisma";
import { contarFila, diasDesde } from "@/lib/cobranca";

// ============================================================================
// RETOMAR CONVERSA
// O cliente respondeu (status Respondido) e a conversa esfriou. Ele aparece em "Cobrar hoje",
// na seção "Retomar conversa", quando já se passaram diasRetomar dias (Ajustes da empresa)
// desde a data mais recente entre:
//   - statusAlteradoEm (quando virou Respondido) e
//   - retomadoEm (o último "Já retomei").
// Quem tem data de próximo passo (tela "Hoje") não entra aqui: a data já diz quando retomar.
// diasRetomar vazio = desligado. O sistema NUNCA marca Respondido como Perdido sozinho:
// quem esfriou, a pessoa decide à mão ("Mudar status").
// ============================================================================

export type ItemRetomar = {
  orcamentoId: string;
  numero: number;
  cliente: string;
  telefone: string | null;
  dias: number; // há quantos dias respondeu (ou foi retomado pela última vez)
  jaRetomado: boolean; // true: os dias contam do último "Já retomei"
};

export async function buscarRetomar(empresaId: string): Promise<ItemRetomar[]> {
  const empresa = await prisma.empresa.findUniqueOrThrow({
    where: { id: empresaId },
    select: { diasRetomar: true },
  });
  if (empresa.diasRetomar === null) return [];

  const respondidos = await prisma.orcamento.findMany({
    // Quem já tem data de próximo passo é acompanhado pela tela "Hoje" (src/lib/negociacao.ts)
    where: { empresaId, status: "respondido", proximoPassoEm: null },
    select: {
      id: true,
      numero: true,
      statusAlteradoEm: true,
      retomadoEm: true,
      cliente: { select: { nome: true, telefone: true } },
    },
  });

  const lista: ItemRetomar[] = [];
  for (const o of respondidos) {
    const jaRetomado = o.retomadoEm !== null && o.retomadoEm > o.statusAlteradoEm;
    const dias = diasDesde(jaRetomado ? o.retomadoEm! : o.statusAlteradoEm);
    if (dias < empresa.diasRetomar) continue;
    lista.push({
      orcamentoId: o.id,
      numero: o.numero,
      cliente: o.cliente.nome,
      telefone: o.cliente.telefone,
      dias,
      jaRetomado,
    });
  }
  // Os parados há mais tempo primeiro
  return lista.sort((a, b) => b.dias - a.dias);
}

// O número da bolinha vermelha e do aviso da lista de orçamentos: cobranças devidas + quem
// retomar. Uma função só para os dois lugares, para os números baterem.
export async function contarPendencias(empresaId: string): Promise<number> {
  const [cobrar, retomar] = await Promise.all([contarFila(empresaId), buscarRetomar(empresaId)]);
  return cobrar + retomar.length;
}
