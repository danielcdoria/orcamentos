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
    chavePix: texto("chavePix").replace(/\s+/g, ""), // nenhum tipo de chave tem espaço: tira os digitados
    nomeRecebedorPix: texto("nomeRecebedorPix").replace(/\s+/g, " "),
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
  // Pix: só texto exibido no orçamento
  if (valores.chavePix.length > 100) return falhar("Chave Pix muito longa. Confira se copiou só a chave.");
  if (valores.nomeRecebedorPix.length > 100) return falhar("Nome do recebedor muito longo.");
  if (valores.nomeRecebedorPix && !valores.chavePix) {
    return falhar("Preencha a chave Pix (ou apague o nome do recebedor).");
  }

  await prisma.empresa.update({
    where: { id: empresaId },
    data: {
      nome: valores.nome,
      telefone: valores.telefone || null,
      condicaoPagamento: valores.condicaoPagamento || null,
      diasValidade: dias,
      mensagemEnvio: valores.mensagemEnvio,
      chavePix: valores.chavePix || null,
      nomeRecebedorPix: valores.nomeRecebedorPix || null,
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

// ---------- Cobrança (prazos) ----------
// Os 4 modelos de mensagem de cobrança (msgCobranca*) continuam no banco, mas não são mais
// editados nem usados: a pessoa escreve cada cobrança no WhatsApp e marca "Já cobrei".

export async function salvarCobranca(_estado: EstadoForm, formData: FormData): Promise<EstadoForm> {
  const { empresaId } = await exigirSessao();

  const texto = (nome: string) => String(formData.get(nome) ?? "").trim();
  const valores: Record<string, string> = {
    prazoCobranca1: texto("prazoCobranca1"),
    prazoCobranca2: texto("prazoCobranca2"),
    prazoPerdido: texto("prazoPerdido"),
  };
  const falhar = (erro: string): EstadoForm => ({ erro, valores });

  const [p1, p2, perdido] = [valores.prazoCobranca1, valores.prazoCobranca2, valores.prazoPerdido].map(Number);
  if (![p1, p2, perdido].every((n) => Number.isInteger(n) && n >= 1 && n <= 90)) {
    return falhar("Os dias precisam ser números entre 1 e 90.");
  }
  if (!(p1 < p2 && p2 < perdido)) {
    return falhar("Os dias precisam estar em ordem: 1ª cobrança, depois 2ª cobrança, depois desistir.");
  }

  await prisma.empresa.update({
    where: { id: empresaId },
    data: {
      prazoCobranca1: p1,
      prazoCobranca2: p2,
      prazoPerdido: perdido,
    },
  });

  revalidatePath("/", "layout"); // a fila de cobrança depende destes valores
  return { ok: true };
}
