"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { exigirSessao } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { calcularSubtotal, lerQuantidade } from "@/lib/dinheiro";

// O que o formulário manda. Repare que NÃO vem subtotal nem total:
// o servidor recalcula tudo, porque qualquer valor vindo do navegador pode ser adulterado.
export type DadosOrcamento = {
  clienteId: string;
  observacao: string;
  linhas: { descricao: string; quantidade: string; precoUnitario: number }[];
};

export type EstadoOrcamento = { erro?: string };

const MAX_LINHAS = 100;

export async function salvarOrcamento(dados: DadosOrcamento): Promise<EstadoOrcamento> {
  const { empresaId } = await exigirSessao();

  // --- validação ---
  const cliente = await prisma.cliente.findFirst({
    where: { id: dados.clienteId, empresaId },
    select: { id: true },
  });
  if (!cliente) return { erro: "Escolha um cliente." };

  if (!Array.isArray(dados.linhas) || dados.linhas.length === 0) {
    return { erro: "Adicione pelo menos um item." };
  }
  if (dados.linhas.length > MAX_LINHAS) return { erro: `Máximo de ${MAX_LINHAS} itens.` };

  const observacao = String(dados.observacao ?? "").trim();
  if (observacao.length > 2000) return { erro: "Observação muito longa." };

  const linhas: Prisma.OrcamentoItemCreateManyOrcamentoInput[] = [];
  for (const [i, linha] of dados.linhas.entries()) {
    const descricao = String(linha.descricao ?? "").trim();
    const quantidade = lerQuantidade(String(linha.quantidade ?? ""));
    const preco = linha.precoUnitario;

    if (!descricao || descricao.length > 200) return { erro: `Item ${i + 1}: descrição inválida.` };
    if (quantidade === null || quantidade > 1_000_000) {
      return { erro: `Item ${i + 1} (${descricao}): quantidade inválida.` };
    }
    if (!Number.isInteger(preco) || preco < 0 || preco > 100_000_000_00) {
      return { erro: `Item ${i + 1} (${descricao}): preço inválido.` };
    }

    linhas.push({
      empresaId,
      descricao,
      quantidade: String(quantidade), // Decimal: passamos como texto para não perder precisão
      precoUnitario: preco,
      subtotal: calcularSubtotal(quantidade, preco),
    });
  }

  const total = linhas.reduce((soma, l) => soma + l.subtotal, 0);

  const empresa = await prisma.empresa.findUniqueOrThrow({
    where: { id: empresaId },
    select: { diasValidade: true },
  });
  const validoAte = new Date();
  validoAte.setDate(validoAte.getDate() + empresa.diasValidade);

  // --- gravação ---
  // O número é "maior número da empresa + 1". Se dois orçamentos forem salvos no mesmo
  // instante, os dois podem calcular o mesmo número; o banco recusa o segundo
  // (regra @@unique) e nós tentamos de novo.
  for (let tentativa = 0; tentativa < 3; tentativa++) {
    try {
      await prisma.$transaction(async (tx) => {
        const ultimo = await tx.orcamento.aggregate({
          where: { empresaId },
          _max: { numero: true },
        });
        await tx.orcamento.create({
          data: {
            empresaId,
            clienteId: cliente.id,
            numero: (ultimo._max.numero ?? 0) + 1,
            total,
            observacao: observacao || null,
            validoAte,
            itens: { create: linhas },
          },
        });
      });
      break;
    } catch (erro) {
      const numeroRepetido =
        erro instanceof Prisma.PrismaClientKnownRequestError && erro.code === "P2002";
      if (!numeroRepetido || tentativa === 2) throw erro;
    }
  }

  revalidatePath("/orcamentos");
  redirect("/orcamentos");
}
