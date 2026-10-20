-- CreateEnum
CREATE TYPE "EtapaVenda" AS ENUM ('interessado', 'demonstracao', 'proposta', 'negociando');

-- CreateEnum
CREATE TYPE "VezDe" AS ENUM ('eu', 'cliente');

-- AlterTable
ALTER TABLE "Orcamento" ADD COLUMN     "etapa" "EtapaVenda",
ADD COLUMN     "proximoPasso" TEXT,
ADD COLUMN     "proximoPassoEm" TIMESTAMP(3),
ADD COLUMN     "vezDe" "VezDe";
