-- CreateEnum
CREATE TYPE "TipoItem" AS ENUM ('fixo', 'opcao', 'adicional');

-- AlterTable
ALTER TABLE "Orcamento" ALTER COLUMN "token" SET DEFAULT replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '');

-- AlterTable
ALTER TABLE "OrcamentoItem" ADD COLUMN     "grupo" TEXT,
ADD COLUMN     "incluido" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "padrao" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "tipo" "TipoItem" NOT NULL DEFAULT 'fixo';

-- CreateTable
CREATE TABLE "EscolhaCliente" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "orcamentoId" TEXT NOT NULL,
    "resumo" TEXT NOT NULL,
    "total" INTEGER NOT NULL,
    "criadaEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EscolhaCliente_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EscolhaCliente_orcamentoId_criadaEm_idx" ON "EscolhaCliente"("orcamentoId", "criadaEm");

-- AddForeignKey
ALTER TABLE "EscolhaCliente" ADD CONSTRAINT "EscolhaCliente_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EscolhaCliente" ADD CONSTRAINT "EscolhaCliente_orcamentoId_fkey" FOREIGN KEY ("orcamentoId") REFERENCES "Orcamento"("id") ON DELETE CASCADE ON UPDATE CASCADE;

