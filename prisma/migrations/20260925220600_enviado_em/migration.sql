-- AlterTable
ALTER TABLE "Orcamento" ADD COLUMN     "enviadoEm" TIMESTAMP(3),
ALTER COLUMN "token" SET DEFAULT replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '');
