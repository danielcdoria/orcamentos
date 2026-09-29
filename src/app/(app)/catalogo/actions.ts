"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { exigirSessao } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { lerReais, VALOR_MAXIMO } from "@/lib/dinheiro";

// Em caso de erro, devolvemos também o que foi digitado ("valores"), porque o React
// limpa o formulário depois de enviar. Assim a pessoa não precisa digitar tudo de novo.
export type EstadoForm = { erro?: string; valores?: Record<string, string> };

// id = null cria um item novo; id preenchido edita um existente.
export async function salvarItem(
  id: string | null,
  _estado: EstadoForm,
  formData: FormData,
): Promise<EstadoForm> {
  const { empresaId } = await exigirSessao();

  const descricao = String(formData.get("descricao") ?? "").trim();
  const unidade = String(formData.get("unidade") ?? "").trim() || "un";
  const precoTexto = String(formData.get("preco") ?? "").trim();
  const preco = lerReais(precoTexto);
  // Custo padrão: opcional e interno (sugerido quando o item entra num orçamento)
  const custoTexto = String(formData.get("custo") ?? "").trim();
  const custo = custoTexto ? lerReais(custoTexto) : null;
  const falhar = (erro: string): EstadoForm => ({
    erro,
    valores: { descricao, unidade, precoTexto, custoTexto },
  });

  if (!descricao) return falhar("Escreva o nome do produto ou serviço.");
  if (descricao.length > 200) return falhar("Descrição muito longa (máximo 200 caracteres).");
  if (unidade.length > 20) return falhar("Unidade muito longa.");
  if (preco === null) return falhar("O preço está errado. Escreva assim: 12,50");
  if (preco > VALOR_MAXIMO) return falhar("Preço alto demais. O máximo é R$ 20.000.000,00.");
  if (custoTexto && custo === null) return falhar("O custo está errado. Escreva assim: 12,50 (ou deixe vazio).");
  if (custo !== null && custo > VALOR_MAXIMO) return falhar("Custo alto demais. O máximo é R$ 20.000.000,00.");

  const dados = { descricao, unidade, preco, custo };

  if (id) {
    const { count } = await prisma.item.updateMany({ where: { id, empresaId }, data: dados });
    if (count === 0) return falhar("Item não encontrado.");
  } else {
    await prisma.item.create({ data: { ...dados, empresaId } });
  }

  revalidatePath("/catalogo");
  redirect("/catalogo?ok=item-salvo");
}

export async function apagarItem(id: string) {
  const { empresaId } = await exigirSessao();
  // Apagar do catálogo não afeta orçamentos já feitos: eles guardam uma cópia do item.
  await prisma.item.deleteMany({ where: { id, empresaId } });
  revalidatePath("/catalogo");
  redirect("/catalogo?ok=item-apagado");
}
