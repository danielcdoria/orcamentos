-- AlterTable
ALTER TABLE "Empresa" ADD COLUMN     "chavePix" TEXT,
ADD COLUMN     "nomeRecebedorPix" TEXT;

-- AlterTable
ALTER TABLE "Orcamento" ALTER COLUMN "token" SET DEFAULT replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '');

