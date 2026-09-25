"use server";

import { revalidatePath } from "next/cache";
import { exigirSessao } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export type EstadoForm = { erro?: string; ok?: boolean; valores?: Record<string, string> };

export async function salvarEmpresa(_estado: EstadoForm, formData: FormData): Promise<EstadoForm> {
  const { empresaId } = await exigirSessao();

  const texto = (nome: string) => String(formData.get(nome) ?? "").trim();
  const valores = {
    nome: texto("nome"),
    telefone: texto("telefone"),
    condicaoPagamento: texto("condicaoPagamento"),
    diasValidade: texto("diasValidade"),
    mensagemEnvio: texto("mensagemEnvio"),
  };
  const falhar = (erro: string): EstadoForm => ({ erro, valores });

  const dias = Number(valores.diasValidade);
  if (!valores.nome) return falhar("O nome da empresa é obrigatório.");
  if (valores.nome.length > 120) return falhar("Nome muito longo.");
  if (valores.condicaoPagamento.length > 500) return falhar("Condição de pagamento muito longa.");
  if (!Number.isInteger(dias) || dias < 1 || dias > 365) {
    return falhar("A validade precisa ser um número de dias entre 1 e 365.");
  }
  if (!valores.mensagemEnvio.includes("{link}")) {
    return falhar("A mensagem precisa ter {link}, senão o cliente recebe a mensagem sem o orçamento.");
  }
  if (valores.mensagemEnvio.length > 1000) return falhar("Mensagem muito longa.");

  await prisma.empresa.update({
    where: { id: empresaId },
    data: {
      nome: valores.nome,
      telefone: valores.telefone || null,
      condicaoPagamento: valores.condicaoPagamento || null,
      diasValidade: dias,
      mensagemEnvio: valores.mensagemEnvio,
    },
  });

  revalidatePath("/", "layout"); // o nome da empresa aparece no topo de todas as telas
  return { ok: true };
}

// ---------- Logo ----------

const TAMANHO_MAX = 900 * 1024; // o navegador já reduz a imagem antes; isto é só uma trava

// Confere os primeiros bytes do arquivo ("assinatura"), em vez de confiar no nome ou
// no tipo informado pelo navegador, que podem ser falsificados.
function tipoDaImagem(b: Uint8Array): string | null {
  const ascii = (inicio: number, fim: number) => String.fromCharCode(...b.slice(inicio, fim));
  if (b[0] === 0x89 && ascii(1, 4) === "PNG") return "image/png";
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg";
  if (ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP") return "image/webp";
  return null;
}

export async function salvarLogo(formData: FormData): Promise<{ erro?: string }> {
  const { empresaId } = await exigirSessao();

  const arquivo = formData.get("logo");
  if (!(arquivo instanceof File) || arquivo.size === 0) return { erro: "Escolha uma imagem." };
  if (arquivo.size > TAMANHO_MAX) return { erro: "Imagem muito grande." };

  const dados = new Uint8Array(await arquivo.arrayBuffer());
  const tipo = tipoDaImagem(dados);
  if (!tipo) return { erro: "Formato não aceito. Use PNG, JPG ou WebP." };

  await prisma.empresaLogo.upsert({
    where: { empresaId },
    create: { empresaId, dados, tipo },
    update: { dados, tipo },
  });
  // O "?v=" muda a cada troca, para o navegador não mostrar o logo antigo guardado.
  await prisma.empresa.update({
    where: { id: empresaId },
    data: { logoUrl: `/logo/${empresaId}?v=${Date.now()}` },
  });

  revalidatePath("/configuracoes");
  return {};
}

export async function removerLogo(): Promise<void> {
  const { empresaId } = await exigirSessao();
  await prisma.empresaLogo.deleteMany({ where: { empresaId } });
  await prisma.empresa.update({ where: { id: empresaId }, data: { logoUrl: null } });
  revalidatePath("/configuracoes");
}
