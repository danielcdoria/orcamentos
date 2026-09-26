// Trava: dá erro se alguém importar este arquivo numa parte que roda no navegador.
// A conexão com o banco (e o endereço com a senha) nunca pode sair do servidor.
import "server-only";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

// Cria a conexão com o banco uma única vez.
// Em desenvolvimento, o Next recarrega os arquivos a cada mudança; sem guardar
// o cliente em globalThis, cada recarga abriria uma conexão nova até esgotar o banco.

function criarPrisma() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  return new PrismaClient({ adapter });
}

const globalParaPrisma = globalThis as unknown as {
  prisma?: ReturnType<typeof criarPrisma>;
  prismaClasse?: typeof PrismaClient;
};

// Depois de uma migration, o "npx prisma generate" cria uma versão nova do PrismaClient.
// Se o cliente guardado veio da versão antiga, descartamos e criamos outro.
// Assim não é preciso reiniciar o "npm run dev" depois de mudar o banco.
if (!globalParaPrisma.prisma || globalParaPrisma.prismaClasse !== PrismaClient) {
  void globalParaPrisma.prisma?.$disconnect();
  globalParaPrisma.prisma = criarPrisma();
  globalParaPrisma.prismaClasse = PrismaClient;
}

export const prisma = globalParaPrisma.prisma;
