"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { conferirSenha, gerarHashSenha } from "@/lib/senha";
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

  if (usuario.bloqueadoAte && usuario.bloqueadoAte > new Date()) {
    return { erro: "Muitas tentativas erradas. Espere 15 minutos e tente de novo.", email };
  }

  const senhaCerta = await conferirSenha(senha, usuario.senhaHash);

  if (!senhaCerta) {
    const tentativas = usuario.tentativasFalhas + 1;
    const bloquear = tentativas >= MAX_TENTATIVAS;
    await prisma.usuario.update({
      where: { id: usuario.id },
      data: {
        tentativasFalhas: bloquear ? 0 : tentativas,
        bloqueadoAte: bloquear ? new Date(Date.now() + BLOQUEIO_MS) : null,
      },
    });
    return { erro: "Email ou senha incorretos.", email };
  }

  // Senha certa: zera o contador, apaga sessões vencidas desse usuário e cria uma nova.
  await prisma.usuario.update({
    where: { id: usuario.id },
    data: { tentativasFalhas: 0, bloqueadoAte: null },
  });
  await prisma.sessao.deleteMany({
    where: { usuarioId: usuario.id, expiraEm: { lt: new Date() } },
  });
  await criarSessao(usuario.id, usuario.empresaId);

  redirect("/");
}
