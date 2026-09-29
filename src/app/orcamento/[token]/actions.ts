"use server";

import { prisma } from "@/lib/prisma";
import { lerSessao } from "@/lib/sessao";
import { organizar, resumoEscolha, somarIncluidos } from "@/lib/opcoes";

// AÇÃO PÚBLICA (sem login): o cliente final escolhe as opções na página do orçamento.
// Qualquer pessoa na internet consegue chamar esta função, então ela confia SÓ no token
// (o código secreto do link) e confere tudo: mexe apenas nos itens DAQUELE orçamento,
// só em opções e adicionais (nunca em itens fixos), e exige uma opção por grupo.
// O preço e o total são sempre os do banco: do navegador vem só "quais itens estão marcados".

const MAX_HISTORICO = 100; // trocas registradas por orçamento (evita encher o banco de propósito)

export type RespostaEscolha = { ok: true } | { ok: false; erro: string };

export async function salvarEscolha(token: unknown, marcados: unknown): Promise<RespostaEscolha> {
  if (typeof token !== "string" || !/^[a-f0-9]{64}$/.test(token)) {
    return { ok: false, erro: "Orçamento não encontrado." };
  }
  if (!Array.isArray(marcados) || marcados.length > 200 || !marcados.every((x) => typeof x === "string")) {
    return { ok: false, erro: "Escolha inválida." };
  }

  const o = await prisma.orcamento.findUnique({
    where: { token },
    select: {
      id: true,
      empresaId: true,
      status: true,
      itens: {
        orderBy: { id: "asc" },
        select: { id: true, descricao: true, tipo: true, grupo: true, subtotal: true, incluido: true },
      },
    },
  });
  if (!o) return { ok: false, erro: "Orçamento não encontrado." };
  if (o.status === "fechado") {
    return { ok: false, erro: "Este orçamento já foi fechado. Para mudar alguma coisa, fale com a empresa." };
  }

  // A própria empresa conferindo o link ("Ver como o cliente vê") não conta como escolha do cliente
  const sessao = await lerSessao();
  if (sessao?.empresaId === o.empresaId) return { ok: true };

  // Monta a escolha nova a partir dos itens do banco: fixo sempre entra; o resto, se veio marcado
  const pedidos = new Set(marcados as string[]);
  const novos = o.itens.map((i) => ({ ...i, incluido: i.tipo === "fixo" || pedidos.has(i.id) }));
  if (!novos.some((i) => i.tipo !== "fixo")) return { ok: false, erro: "Este orçamento não tem opções." };
  if (organizar(novos).grupos.some((g) => g.itens.filter((i) => i.incluido).length !== 1)) {
    return { ok: false, erro: "Escolha uma opção em cada grupo." };
  }

  const mudou = novos.some((n, k) => n.incluido !== o.itens[k].incluido);
  if (!mudou) return { ok: true };

  const total = somarIncluidos(novos);
  const ids = (incluido: boolean) => novos.filter((i) => i.incluido === incluido).map((i) => i.id);

  await prisma.$transaction(async (tx) => {
    // sempre com orcamentoId no filtro: só itens deste orçamento podem mudar
    await tx.orcamentoItem.updateMany({ where: { orcamentoId: o.id, id: { in: ids(true) } }, data: { incluido: true } });
    await tx.orcamentoItem.updateMany({ where: { orcamentoId: o.id, id: { in: ids(false) } }, data: { incluido: false } });
    await tx.orcamento.update({ where: { id: o.id }, data: { total } });
    // histórico: o que ficou escolhido e quando (para o dono ver se o cliente ficou trocando)
    const registradas = await tx.escolhaCliente.count({ where: { orcamentoId: o.id } });
    if (registradas < MAX_HISTORICO) {
      await tx.escolhaCliente.create({
        data: { empresaId: o.empresaId, orcamentoId: o.id, resumo: resumoEscolha(novos), total },
      });
    }
  });
  return { ok: true };
}
