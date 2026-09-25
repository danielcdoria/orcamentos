-- AlterTable
ALTER TABLE "Orcamento" ADD COLUMN     "token" TEXT NOT NULL DEFAULT replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '');

-- CreateIndex
CREATE UNIQUE INDEX "Orcamento_token_key" ON "Orcamento"("token");

