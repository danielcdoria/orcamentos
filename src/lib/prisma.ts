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
};

export const prisma = globalParaPrisma.prisma ?? criarPrisma();

if (process.env.NODE_ENV !== "production") {
  globalParaPrisma.prisma = prisma;
}
