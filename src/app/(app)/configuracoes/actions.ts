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
  if (!valores.nome) return falhar("Escreva o nome da empresa.");
  if (valores.nome.length > 120) return falhar("Nome muito longo.");
  if (valores.condicaoPagamento.length > 500) return falhar("Condição de pagamento muito longa.");
  if (!Number.isInteger(dias) || dias < 1 || dias > 365) {
    return falhar("A validade precisa ser um número de dias entre 1 e 365.");
  }
  if (!valores.mensagemEnvio.includes("{link}")) {
    return falhar("A mensagem precisa ter a palavra {link}. É ela que vira o link do orçamento; sem ela, o cliente recebe a mensagem sem o orçamento.");
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
  if (!tipo) return { erro: "Essa imagem não serve. Use uma foto ou imagem PNG ou JPG." };

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

// ---------- Cobrança (prazos e modelos de mensagem) ----------

const CAMPOS_MENSAGEM = [
  "msgCobranca1NaoAbriu",
  "msgCobranca1Abriu",
  "msgCobranca2NaoAbriu",
  "msgCobranca2Abriu",
] as const;

export async function salvarCobranca(_estado: EstadoForm, formData: FormData): Promise<EstadoForm> {
  const { empresaId } = await exigirSessao();

  const texto = (nome: string) => String(formData.get(nome) ?? "").trim();
  const valores: Record<string, string> = {
    prazoCobranca1: texto("prazoCobranca1"),
    prazoCobranca2: texto("prazoCobranca2"),
    prazoPerdido: texto("prazoPerdido"),
  };
  for (const campo of CAMPOS_MENSAGEM) valores[campo] = texto(campo);
  const falhar = (erro: string): EstadoForm => ({ erro, valores });

  const [p1, p2, perdido] = [valores.prazoCobranca1, valores.prazoCobranca2, valores.prazoPerdido].map(Number);
  if (![p1, p2, perdido].every((n) => Number.isInteger(n) && n >= 1 && n <= 90)) {
    return falhar("Os dias precisam ser números entre 1 e 90.");
  }
  if (!(p1 < p2 && p2 < perdido)) {
    return falhar("Os dias precisam estar em ordem: 1ª cobrança, depois 2ª cobrança, depois desistir.");
  }
  for (const campo of CAMPOS_MENSAGEM) {
    if (!valores[campo]) return falhar("Nenhuma mensagem pode ficar vazia.");
    if (valores[campo].length > 1000) return falhar("Mensagem muito longa (máximo 1000 caracteres).");
  }

  await prisma.empresa.update({
    where: { id: empresaId },
    data: {
      prazoCobranca1: p1,
      prazoCobranca2: p2,
      prazoPerdido: perdido,
      msgCobranca1NaoAbriu: valores.msgCobranca1NaoAbriu,
      msgCobranca1Abriu: valores.msgCobranca1Abriu,
      msgCobranca2NaoAbriu: valores.msgCobranca2NaoAbriu,
      msgCobranca2Abriu: valores.msgCobranca2Abriu,
    },
  });

  revalidatePath("/", "layout"); // a fila de cobrança depende destes valores
  return { ok: true };
}
