-- AlterTable
ALTER TABLE "Empresa" ADD COLUMN     "diasRetomar" INTEGER DEFAULT 3;

-- AlterTable
ALTER TABLE "Orcamento" ADD COLUMN     "retomadoEm" TIMESTAMP(3),
ADD COLUMN     "statusAlteradoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "token" SET DEFAULT replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '');
