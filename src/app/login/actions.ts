"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { conferirSenha, gerarHashSenha, precisaRefazer } from "@/lib/senha";
import { criarSessao } from "@/lib/sessao";

export type EstadoLogin = { erro?: string; email?: string };

const MAX_TENTATIVAS = 5;
const BLOQUEIO_MS = 15 * 60 * 1000; // 15 minutos

// Hash de uma senha qualquer, usado quando o email não existe (explicação abaixo).
const hashFalso = gerarHashSenha("senha-que-nao-existe");

export async function entrar(_estado: EstadoLogin, formData: FormData): Promise<EstadoLogin> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const senha = String(formData.get("senha") ?? "");

  if (!email || !senha) {
    return { erro: "Preencha email e senha.", email };
  }

  const usuario = await prisma.usuario.findUnique({ where: { email } });

  if (!usuario) {
    // Mesmo sem usuário, conferimos uma senha falsa. Assim a resposta demora o mesmo
    // tempo nos dois casos, e ninguém descobre quais emails existem medindo a demora.
    await conferirSenha(senha, await hashFalso);
    return { erro: "Email ou senha incorretos.", email };
  }

  const agora = new Date();
  const mensagemBloqueio = "Muitas tentativas erradas. Espere 15 minutos e tente de novo.";

  if (usuario.bloqueadoAte && usuario.bloqueadoAte > agora) {
    return { erro: mensagemBloqueio, email };
  }

  // Bloqueio antigo já venceu: zera o contador.
  if (usuario.bloqueadoAte) {
    await prisma.usuario.updateMany({
      where: { id: usuario.id, bloqueadoAte: { lte: agora } },
      data: { tentativasFalhas: 0, bloqueadoAte: null },
    });
  }

  // Cada tentativa "gasta uma ficha" ANTES de conferir a senha, somando +1 direto no
  // banco (operação única). Assim, mesmo que um robô mande 50 tentativas ao mesmo tempo,
  // só as 5 primeiras chegam a ter a senha conferida; o resto é recusado.
  const { tentativasFalhas: tentativa } = await prisma.usuario.update({
    where: { id: usuario.id },
    data: { tentativasFalhas: { increment: 1 } },
    select: { tentativasFalhas: true },
  });
  const bloquear = () =>
    prisma.usuario.updateMany({
      where: { id: usuario.id, bloqueadoAte: null },
      data: { bloqueadoAte: new Date(Date.now() + BLOQUEIO_MS) },
    });

  if (tentativa > MAX_TENTATIVAS) {
    await bloquear();
    return { erro: mensagemBloqueio, email };
  }

  const senhaCerta = await conferirSenha(senha, usuario.senhaHash);

  if (!senhaCerta) {
    if (tentativa >= MAX_TENTATIVAS) await bloquear(); // foi a 5ª errada
    return { erro: "Email ou senha incorretos.", email };
  }

  // Senha certa: zera o contador. Se o hash era do formato antigo (mais fraco),
  // aproveita que temos a senha agora e guarda no formato forte.
  await prisma.usuario.update({
    where: { id: usuario.id },
    data: {
      tentativasFalhas: 0,
      bloqueadoAte: null,
      ...(precisaRefazer(usuario.senhaHash) && { senhaHash: await gerarHashSenha(senha) }),
    },
  });
  // Apaga sessões vencidas desse usuário e cria uma nova.
  await prisma.sessao.deleteMany({
    where: { usuarioId: usuario.id, expiraEm: { lt: new Date() } },
  });
  await criarSessao(usuario.id, usuario.empresaId);

  redirect("/");
}
