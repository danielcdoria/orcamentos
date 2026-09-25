"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { exigirSessao } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Em caso de erro, devolvemos também o que foi digitado ("valores"), porque o React
// limpa o formulário depois de enviar. Assim a pessoa não precisa digitar tudo de novo.
export type EstadoForm = { erro?: string; valores?: Record<string, string> };

function lerCampos(formData: FormData) {
  const texto = (nome: string) => String(formData.get(nome) ?? "").trim();
  return {
    nome: texto("nome"),
    telefone: texto("telefone") || null,
    observacao: texto("observacao") || null,
  };
}

// id = null cria um cliente novo; id preenchido edita um existente.
export async function salvarCliente(
  id: string | null,
  _estado: EstadoForm,
  formData: FormData,
): Promise<EstadoForm> {
  const { empresaId } = await exigirSessao();
  const dados = lerCampos(formData);
  const falhar = (erro: string): EstadoForm => ({
    erro,
    valores: { nome: dados.nome, telefone: dados.telefone ?? "", observacao: dados.observacao ?? "" },
  });

  if (!dados.nome) return falhar("O nome é obrigatório.");
  if (dados.nome.length > 120) return falhar("Nome muito longo (máximo 120 caracteres).");
  if ((dados.observacao?.length ?? 0) > 1000) return falhar("Observação muito longa.");

  if (id) {
    // updateMany com empresaId no filtro: só altera se o cliente for DESTA empresa.
    const { count } = await prisma.cliente.updateMany({
      where: { id, empresaId },
      data: dados,
    });
    if (count === 0) return falhar("Cliente não encontrado.");
  } else {
    await prisma.cliente.create({ data: { ...dados, empresaId } });
  }

  revalidatePath("/clientes");
  redirect("/clientes");
}
