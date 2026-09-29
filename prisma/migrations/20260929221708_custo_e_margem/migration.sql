-- AlterTable
ALTER TABLE "Item" ADD COLUMN     "custo" INTEGER;

-- AlterTable
ALTER TABLE "Orcamento" ALTER COLUMN "token" SET DEFAULT replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '');

-- AlterTable
ALTER TABLE "OrcamentoItem" ADD COLUMN     "custoUnitario" INTEGER;
