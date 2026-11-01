"use server";

import { revalidatePath } from "next/cache";
import { exigirSessao } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { lerAvaliacoes, lerLinkDemo, lerNota } from "@/lib/prospeccao";
import { telefoneParaWhatsApp } from "@/lib/telefone";
import { areaParaGravar, filtroArea } from "@/lib/area";

// IMPORTAR LOTE: cadastra vários clientes de uma vez, cada um já com um orçamento
// "Enviado" (a mensagem foi mandada por fora, no WhatsApp). A cobrança conta a partir de agora.
// Uma linha por cliente, campos separados por | ou tab:
//   nome | telefone | cidade | nota | avaliações | link da demonstração | observação
// Só nome e telefone são obrigatórios. Quem já existe (mesmo telefone, em qualquer área) é pulado.

export type ResultadoImportar = {
  erro?: string;
  criados?: string[];
  pulados?: string[]; // "Nome (motivo)"
  lista?: string; // o texto colado, devolvido em caso de erro (o React limpa o formulário)
};

const MAX_LINHAS = 50;

function chaveTelefone(telefone: string | null | undefined): string {
  return telefoneParaWhatsApp(telefone) ?? (telefone ?? "").replace(/\D/g, "");
}

export async function importarLote(_estado: ResultadoImportar, formData: FormData): Promise<ResultadoImportar> {
  const { empresaId } = await exigirSessao();
  const texto = String(formData.get("lista") ?? "");
  const itemId = String(formData.get("itemId") ?? "");

  // O item vem do catálogo DESTA empresa e da área escolhida; o preço é o do banco.
  const item = await prisma.item.findFirst({
    where: { id: itemId, empresaId, ...(await filtroArea(empresaId)) },
    select: { descricao: true, preco: true, custo: true },
  });
  if (!item) return { erro: "Escolha o item do catálogo.", lista: texto };

  const linhas = texto.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (linhas.length === 0) return { erro: "Cole pelo menos uma linha.", lista: texto };
  if (linhas.length > MAX_LINHAS) return { erro: `Máximo de ${MAX_LINHAS} linhas por vez.`, lista: texto };

  const existentes = await prisma.cliente.findMany({ where: { empresaId }, select: { telefone: true } });
  const jaTem = new Set(existentes.map((c) => chaveTelefone(c.telefone)).filter(Boolean));

  const area = await areaParaGravar(empresaId);
  const pulados: string[] = [];
  const novos: Prisma.ClienteCreateManyInput[] = [];
  for (const [i, linha] of linhas.entries()) {
    const c = linha.split(/\s*[|\t]\s*/);
    const [nome = "", telefone = "", cidade = "", nota = "", avaliacoes = "", link = "", obs = ""] = c;
    const rotulo = nome || `Linha ${i + 1}`;
    const chave = chaveTelefone(telefone);
    if (!nome || nome.length > 120) { pulados.push(`${rotulo} (nome vazio ou longo demais)`); continue; }
    if (chave.length < 10) { pulados.push(`${rotulo} (telefone inválido)`); continue; }
    if (jaTem.has(chave)) { pulados.push(`${rotulo} (já cadastrado)`); continue; }
    const notaGoogle = lerNota(nota);
    const avaliacoesGoogle = lerAvaliacoes(avaliacoes);
    const linkDemo = lerLinkDemo(link);
    if (notaGoogle === undefined || avaliacoesGoogle === undefined || linkDemo === undefined) {
      pulados.push(`${rotulo} (nota, avaliações ou link errado)`);
      continue;
    }
    jaTem.add(chave); // telefone repetido dentro da própria lista
    novos.push({
      empresaId,
      area,
      nome,
      telefone,
      cidade: cidade.slice(0, 80) || null,
      abordagem: "mensagem",
      linkDemo,
      notaGoogle,
      avaliacoesGoogle,
      observacao: obs.slice(0, 1000) || null,
    });
  }
  if (novos.length === 0) return { criados: [], pulados };

  const empresa = await prisma.empresa.findUniqueOrThrow({
    where: { id: empresaId },
    select: { diasValidade: true },
  });
  const agora = new Date();
  const validoAte = new Date();
  validoAte.setDate(validoAte.getDate() + empresa.diasValidade);

  // Tudo numa transação: ou entra o lote inteiro, ou nada (sem cliente pela metade).
  // Números em sequência a partir do maior da empresa; se outro orçamento for salvo no mesmo
  // instante, o banco recusa o número repetido e tentamos de novo.
  for (let tentativa = 0; tentativa < 3; tentativa++) {
    try {
      await prisma.$transaction(async (tx) => {
        const ultimo = await tx.orcamento.aggregate({ where: { empresaId }, _max: { numero: true } });
        let numero = ultimo._max.numero ?? 0;
        for (const dados of novos) {
          const cliente = await tx.cliente.create({ data: dados, select: { id: true } });
          numero += 1;
          await tx.orcamento.create({
            data: {
              empresaId,
              clienteId: cliente.id,
              numero,
              total: item.preco,
              validoAte,
              status: "enviado",
              enviadoEm: agora,
              itens: {
                create: [
                  {
                    empresaId,
                    descricao: item.descricao,
                    quantidade: "1",
                    precoUnitario: item.preco,
                    subtotal: item.preco,
                    custoUnitario: item.custo,
                  },
                ],
              },
            },
          });
        }
      }, { timeout: 30_000 });
      break;
    } catch (erro) {
      const numeroRepetido = erro instanceof Prisma.PrismaClientKnownRequestError && erro.code === "P2002";
      if (!numeroRepetido || tentativa === 2) throw erro;
    }
  }

  revalidatePath("/", "layout");
  return { criados: novos.map((n) => n.nome), pulados };
}
