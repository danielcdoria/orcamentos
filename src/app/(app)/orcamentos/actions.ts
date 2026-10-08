"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { exigirSessao } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { calcularSubtotal, lerQuantidade, VALOR_MAXIMO } from "@/lib/dinheiro";
import { LISTA_STATUS } from "@/lib/status";
import { chaveGrupo, maiorTotalPossivel, organizar, padroesEfetivos, somarIncluidos, type Tipo } from "@/lib/opcoes";
import type { StatusOrcamento } from "@/generated/prisma/enums";

// O que o formulário manda. Repare que NÃO vem subtotal nem total:
// o servidor recalcula tudo, porque qualquer valor vindo do navegador pode ser adulterado.
export type DadosOrcamento = {
  clienteId: string;
  observacao: string;
  // "Salvar e marcar como enviado": a mensagem foi (ou vai ser) mandada por fora, sem o
  // botão de envio. Já nasce enviado, e a cobrança conta os dias a partir de agora.
  jaEnviado?: boolean;
  linhas: {
    descricao: string;
    quantidade: string;
    precoUnitario: number;
    custoUnitario?: number | null;
    // opcionais: sem eles, o item é "fixo" (o comportamento de sempre)
    tipo?: Tipo;
    grupo?: string;
    padrao?: boolean;
  }[];
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
  if (!cliente) return { erro: "Escolha o cliente." };

  if (!Array.isArray(dados.linhas) || dados.linhas.length === 0) {
    return { erro: "Adicione pelo menos um item." };
  }
  if (dados.linhas.length > MAX_LINHAS) return { erro: `Máximo de ${MAX_LINHAS} itens.` };

  const observacao = String(dados.observacao ?? "").trim();
  if (observacao.length > 2000) return { erro: "Observação muito longa." };

  type LinhaNova = Prisma.OrcamentoItemCreateManyOrcamentoInput & {
    subtotal: number;
    tipo: Tipo;
    grupo: string | null;
    padrao: boolean;
    incluido: boolean;
  };
  const linhas: LinhaNova[] = [];
  for (const [i, linha] of dados.linhas.entries()) {
    const descricao = String(linha.descricao ?? "").trim();
    const quantidade = lerQuantidade(String(linha.quantidade ?? ""));
    const preco = linha.precoUnitario;

    if (!descricao || descricao.length > 200) return { erro: `Item ${i + 1}: confira o nome do item.` };
    if (quantidade === null || quantidade > 1_000_000) {
      return { erro: `Item ${i + 1} (${descricao}): a quantidade está errada.` };
    }
    if (!Number.isInteger(preco) || preco < 0) {
      return { erro: `Item ${i + 1} (${descricao}): o preço está errado.` };
    }
    const subtotal = calcularSubtotal(quantidade, preco);
    // Custo por unidade: opcional e interno (nunca vai para o cliente final)
    const custo = linha.custoUnitario ?? null;
    if (custo !== null && (!Number.isInteger(custo) || custo < 0 || custo > VALOR_MAXIMO)) {
      return { erro: `Item ${i + 1} (${descricao}): o custo está errado.` };
    }
    if (preco > VALOR_MAXIMO || subtotal > VALOR_MAXIMO) {
      return { erro: `Item ${i + 1} (${descricao}): valor alto demais. O máximo é R$ 20.000.000,00.` };
    }
    // Tipo: fixo (padrão), opção de um grupo ou adicional
    const tipo: Tipo = linha.tipo === "opcao" || linha.tipo === "adicional" ? linha.tipo : "fixo";
    const grupo = tipo === "opcao" ? String(linha.grupo ?? "").trim().replace(/\s+/g, " ") : null;
    if (tipo === "opcao" && !grupo) {
      return { erro: `Item ${i + 1} (${descricao}): escreva o nome do grupo (ex.: Material).` };
    }
    if (grupo && grupo.length > 60) return { erro: `Item ${i + 1} (${descricao}): nome do grupo muito longo.` };

    linhas.push({
      empresaId,
      descricao,
      quantidade: String(quantidade), // Decimal: passamos como texto para não perder precisão
      precoUnitario: preco,
      subtotal,
      custoUnitario: custo,
      tipo,
      grupo,
      padrao: tipo === "opcao" && linha.padrao === true,
      incluido: true, // definido logo abaixo, depois de conhecer os grupos
    });
  }

  // Grupos: todos os itens do grupo ficam com o mesmo nome (o primeiro que foi escrito),
  // cada grupo precisa de pelo menos 2 opções, e só uma delas é a padrão.
  const nomeDoGrupo = new Map<string, string>();
  for (const l of linhas) {
    if (l.tipo !== "opcao") continue;
    if (!nomeDoGrupo.has(chaveGrupo(l.grupo))) nomeDoGrupo.set(chaveGrupo(l.grupo), l.grupo!);
    l.grupo = nomeDoGrupo.get(chaveGrupo(l.grupo))!;
  }
  for (const g of organizar(linhas).grupos) {
    if (g.itens.length < 2) {
      return { erro: `O grupo “${g.nome}” tem só uma opção. Adicione outra ou marque o item como Fixo.` };
    }
  }
  const padroes = padroesEfetivos(linhas);
  linhas.forEach((l, i) => {
    l.padrao = padroes[i];
    // Começa incluído: fixo sempre; opção só a padrão; adicional desmarcado
    l.incluido = l.tipo === "opcao" ? padroes[i] : l.tipo === "fixo";
  });

  // Limite de valor vale também para o total mais caro que o cliente consegue montar
  if (maiorTotalPossivel(linhas) > VALOR_MAXIMO) {
    return { erro: "O total passou de R$ 20.000.000,00, o máximo aceito." };
  }
  const total = somarIncluidos(linhas);

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
  let orcamentoId = "";
  for (let tentativa = 0; tentativa < 3; tentativa++) {
    try {
      orcamentoId = await prisma.$transaction(async (tx) => {
        const ultimo = await tx.orcamento.aggregate({
          where: { empresaId },
          _max: { numero: true },
        });
        const criado = await tx.orcamento.create({
          data: {
            empresaId,
            clienteId: cliente.id,
            numero: (ultimo._max.numero ?? 0) + 1,
            total,
            observacao: observacao || null,
            validoAte,
            ...(dados.jaEnviado === true && { status: "enviado", enviadoEm: new Date() }),
            itens: { create: linhas },
          },
        });
        return criado.id;
      });
      break;
    } catch (erro) {
      const numeroRepetido =
        erro instanceof Prisma.PrismaClientKnownRequestError && erro.code === "P2002";
      if (!numeroRepetido || tentativa === 2) throw erro;
    }
  }

  revalidatePath("/orcamentos");
  // abre o orçamento recém-criado
  redirect(`/orcamentos/${orcamentoId}?ok=${dados.jaEnviado === true ? "orcamento-enviado" : "orcamento-criado"}`);
}

// Chamado quando a pessoa toca em "Enviar no WhatsApp".
// Guarda a data do PRIMEIRO envio (a cobrança conta os dias a partir dela; reenviar não zera)
// e muda de rascunho para enviado (sem "rebaixar" quem já está aberto, respondido etc.).
export async function marcarEnviado(orcamentoId: string) {
  const { empresaId } = await exigirSessao();
  await prisma.$transaction([
    prisma.orcamento.updateMany({
      where: { id: orcamentoId, empresaId, enviadoEm: null },
      data: { enviadoEm: new Date() },
    }),
    prisma.orcamento.updateMany({
      where: { id: orcamentoId, empresaId, status: "rascunho" },
      data: { status: "enviado" },
    }),
  ]);
  revalidatePath("/orcamentos");
  revalidatePath(`/orcamentos/${orcamentoId}`);
}

// Troca manual de status (botões rápidos da lista e da tela do orçamento).
// Quem manda a mensagem por fora e só troca a pílula para "Enviado" (ou já para um status
// depois dele) também precisa de enviadoEm, senão a cobrança nunca conta os dias.
// Só preenche se estiver vazio: o primeiro envio nunca é sobrescrito.
export async function alterarStatus(orcamentoId: string, status: StatusOrcamento) {
  const { empresaId } = await exigirSessao();
  if (!LISTA_STATUS.includes(status)) return; // valor inventado: ignora
  await prisma.$transaction([
    prisma.orcamento.updateMany({ where: { id: orcamentoId, empresaId }, data: { status } }),
    ...(status !== "rascunho"
      ? [
          prisma.orcamento.updateMany({
            where: { id: orcamentoId, empresaId, enviadoEm: null },
            data: { enviadoEm: new Date() },
          }),
        ]
      : []),
  ]);
  revalidatePath("/orcamentos");
  revalidatePath(`/orcamentos/${orcamentoId}`);
}
