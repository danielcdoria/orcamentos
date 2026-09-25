-- AlterTable
ALTER TABLE "Orcamento" ADD COLUMN     "abertoEm" TIMESTAMP(3),
ADD COLUMN     "vezesAberto" INTEGER NOT NULL DEFAULT 0,
ALTER COLUMN "token" SET DEFAULT replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '');
