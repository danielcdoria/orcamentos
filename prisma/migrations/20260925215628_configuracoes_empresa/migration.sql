-- AlterTable
ALTER TABLE "Empresa" ADD COLUMN     "mensagemEnvio" TEXT NOT NULL DEFAULT 'Olá {cliente}, segue o orçamento que combinamos: {link}';

-- AlterTable
ALTER TABLE "Orcamento" ALTER COLUMN "token" SET DEFAULT replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '');

-- CreateTable
CREATE TABLE "EmpresaLogo" (
    "empresaId" TEXT NOT NULL,
    "dados" BYTEA NOT NULL,
    "tipo" TEXT NOT NULL,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmpresaLogo_pkey" PRIMARY KEY ("empresaId")
);

-- AddForeignKey
ALTER TABLE "EmpresaLogo" ADD CONSTRAINT "EmpresaLogo_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;
