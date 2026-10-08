-- CreateEnum
CREATE TYPE "Abordagem" AS ENUM ('mensagem', 'demo');

-- AlterTable
ALTER TABLE "Cliente" ADD COLUMN     "abordagem" "Abordagem",
ADD COLUMN     "avaliacoesGoogle" INTEGER,
ADD COLUMN     "cidade" TEXT,
ADD COLUMN     "instagram" TEXT,
ADD COLUMN     "linkDemo" TEXT,
ADD COLUMN     "notaGoogle" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "Orcamento" ALTER COLUMN "token" SET DEFAULT replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '');
