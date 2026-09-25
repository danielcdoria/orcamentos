import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

// Como o login continua valendo entre uma página e outra:
// 1. No login, sorteamos um código secreto (token) e mandamos para o navegador num cookie.
// 2. No banco guardamos só o hash desse código, junto com quem é o usuário e a empresa.
// 3. A cada página, o navegador devolve o cookie; calculamos o hash e procuramos no banco.
// Se alguém roubar o banco, não consegue usar as sessões, porque não tem os códigos originais.

export const NOME_COOKIE = "sessao";
const DURACAO_MS = 30 * 24 * 60 * 60 * 1000; // 30 dias

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function criarSessao(usuarioId: string, empresaId: string) {
  const token = randomBytes(32).toString("base64url");
  const expiraEm = new Date(Date.now() + DURACAO_MS);

  await prisma.sessao.create({
    data: { tokenHash: hashToken(token), usuarioId, empresaId, expiraEm },
  });

  const cookieStore = await cookies();
  cookieStore.set(NOME_COOKIE, token, {
    httpOnly: true, // o JavaScript da página não consegue ler o cookie
    secure: process.env.NODE_ENV === "production", // só por https (no seu Mac é http)
    sameSite: "lax", // outros sites não conseguem usar seu login
    expires: expiraEm,
    path: "/",
  });
}

// Devolve a sessão válida do cookie atual, ou null.
export async function lerSessao() {
  const token = (await cookies()).get(NOME_COOKIE)?.value;
  if (!token) return null;

  const sessao = await prisma.sessao.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { empresa: { select: { nome: true } } },
  });
  if (!sessao || sessao.expiraEm < new Date()) return null;
  return sessao;
}

export async function apagarSessao() {
  const cookieStore = await cookies();
  const token = cookieStore.get(NOME_COOKIE)?.value;
  if (token) {
    await prisma.sessao.deleteMany({ where: { tokenHash: hashToken(token) } });
  }
  cookieStore.delete(NOME_COOKIE);
}
