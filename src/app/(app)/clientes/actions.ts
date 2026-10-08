"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { exigirSessao } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { LISTA_ABORDAGEM, lerAvaliacoes, lerLinkDemo, lerNota } from "@/lib/prospeccao";

// Em caso de erro, devolvemos também o que foi digitado ("valores"), porque o React
// limpa o formulário depois de enviar. Assim a pessoa não precisa digitar tudo de novo.
export type EstadoForm = { erro?: string; valores?: Record<string, string> };

const CAMPOS = [
  "nome", "telefone", "observacao", "cidade", "abordagem", "linkDemo", "instagram", "notaGoogle", "avaliacoesGoogle",
] as const;

function lerTextos(formData: FormData) {
  return Object.fromEntries(CAMPOS.map((c) => [c, String(formData.get(c) ?? "").trim()])) as Record<
    (typeof CAMPOS)[number],
    string
  >;
}

// id = null cria um cliente novo; id preenchido edita um existente.
// voltar = "orcamento" quando o cadastro começou na tela de novo orçamento: depois de
// salvar, volta para lá com o cliente já escolhido.
export async function salvarCliente(
  id: string | null,
  voltar: string | null,
  _estado: EstadoForm,
  formData: FormData,
): Promise<EstadoForm> {
  const { empresaId } = await exigirSessao();
  const t = lerTextos(formData);
  const falhar = (erro: string): EstadoForm => ({ erro, valores: t });

  if (!t.nome) return falhar("Escreva o nome do cliente.");
  if (t.nome.length > 120) return falhar("Nome muito longo (máximo 120 caracteres).");
  if (t.observacao.length > 1000) return falhar("Observação muito longa.");
  if (t.cidade.length > 80) return falhar("Nome da cidade muito longo.");
  if (t.instagram.length > 200) return falhar("Instagram muito longo.");

  // Valor fora da lista (formulário mexido) não passa: vazio ou uma das abordagens.
  const abordagem = LISTA_ABORDAGEM.find((a) => a === t.abordagem) ?? null;
  if (t.abordagem && !abordagem) return falhar("Abordagem inválida.");
  const linkDemo = lerLinkDemo(t.linkDemo);
  if (linkDemo === undefined || (linkDemo?.length ?? 0) > 500) {
    return falhar("Link da demonstração inválido. Ex.: https://pousadax.com.br");
  }
  const notaGoogle = lerNota(t.notaGoogle);
  if (notaGoogle === undefined) return falhar("Nota do Google deve ser de 0 a 5. Ex.: 4,5");
  const avaliacoesGoogle = lerAvaliacoes(t.avaliacoesGoogle);
  if (avaliacoesGoogle === undefined) return falhar("Avaliações no Google: só números. Ex.: 562");

  const dados = {
    nome: t.nome,
    telefone: t.telefone || null,
    observacao: t.observacao || null,
    cidade: t.cidade || null,
    abordagem,
    linkDemo,
    instagram: t.instagram || null,
    notaGoogle,
    avaliacoesGoogle,
  };

  if (id) {
    // updateMany com empresaId no filtro: só altera se o cliente for DESTA empresa.
    const { count } = await prisma.cliente.updateMany({
      where: { id, empresaId },
      data: dados,
    });
    if (count === 0) return falhar("Cliente não encontrado.");
    revalidatePath("/clientes");
    redirect("/clientes?ok=cliente-salvo");
  }

  const novo = await prisma.cliente.create({ data: { ...dados, empresaId } });
  revalidatePath("/clientes");
  if (voltar === "orcamento") redirect(`/orcamentos/novo?cliente=${novo.id}`);
  redirect("/clientes?ok=cliente-salvo");
}
