// Cadastra uma empresa nova e o usuário que vai fazer login nela.
// Como o sistema não tem cadastro público, é assim que você adiciona cada cliente.
//
// Uso (na pasta do projeto):  npm run criar-empresa

import "dotenv/config";
import { createInterface } from "node:readline";
import { prisma } from "@/lib/prisma";
import { gerarHashSenha } from "@/lib/senha";

const terminal = createInterface({ input: process.stdin });
const linhas = terminal[Symbol.asyncIterator]();

async function perguntar(texto: string, obrigatorio = true): Promise<string> {
  while (true) {
    process.stdout.write(texto);
    const { value, done } = await linhas.next();
    if (done) throw new Error("Entrada encerrada antes de responder tudo.");
    const resposta = String(value).trim();
    if (resposta || !obrigatorio) return resposta;
    console.log("  Esse campo é obrigatório.");
  }
}

async function main() {
  console.log("\n=== Nova empresa ===\n");
  const nome = await perguntar("Nome da empresa: ");
  const telefone = await perguntar("Telefone (opcional): ", false);
  const email = (await perguntar("Email de login: ")).toLowerCase();

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error("Email inválido.");
  }
  if (await prisma.usuario.findUnique({ where: { email } })) {
    throw new Error("Já existe um usuário com esse email.");
  }

  const senha = await perguntar("Senha (mínimo 8 caracteres): ");
  if (senha.length < 8) throw new Error("A senha precisa ter pelo menos 8 caracteres.");

  // Cria a empresa e o usuário juntos: se um falhar, nenhum dos dois é salvo.
  const empresa = await prisma.empresa.create({
    data: {
      nome,
      telefone: telefone || null,
      usuario: { create: { email, senhaHash: await gerarHashSenha(senha) } },
    },
  });

  console.log(`\nPronto! Empresa "${empresa.nome}" criada. Login: ${email}`);
  console.log("Dica: limpe o terminal (Cmd + K) para a senha não ficar na tela.\n");
}

main()
  .catch((erro) => {
    console.error(`\nErro: ${erro.message}\n`);
    process.exitCode = 1;
  })
  .finally(async () => {
    terminal.close();
    await prisma.$disconnect();
  });
