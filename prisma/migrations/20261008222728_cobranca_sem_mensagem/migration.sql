-- AlterTable
ALTER TABLE "Cobranca" ALTER COLUMN "mensagem" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Orcamento" ALTER COLUMN "token" SET DEFAULT replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '');
