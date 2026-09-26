-- AlterTable
ALTER TABLE "Empresa" ADD COLUMN     "msgCobranca1Abriu" TEXT NOT NULL DEFAULT 'Oi, {cliente}! Tudo certo? Vi que você deu uma olhada no orçamento. Ficou alguma dúvida ou quer ajustar alguma coisa? É só me falar que a gente acerta 🙂',
ADD COLUMN     "msgCobranca1NaoAbriu" TEXT NOT NULL DEFAULT 'Oi, {cliente}! Tudo bem? Te mandei o orçamento da {empresa} há uns dias, mas acho que acabou se perdendo aí no meio das mensagens. Vou deixar o link de novo aqui: {link}',
ADD COLUMN     "msgCobranca2Abriu" TEXT NOT NULL DEFAULT 'Oi, {cliente}! Queria saber se o orçamento ainda faz sentido pra você. Se o valor ou o prazo não encaixou, me conta que eu vejo o que dá pra fazer. Ele vale até {validade}.',
ADD COLUMN     "msgCobranca2NaoAbriu" TEXT NOT NULL DEFAULT 'Oi, {cliente}, tudo bem? Passando só pra confirmar se o orçamento chegou certinho pra você. Ele fica válido até {validade}. O link é este: {link}',
ADD COLUMN     "prazoCobranca1" INTEGER NOT NULL DEFAULT 2,
ADD COLUMN     "prazoCobranca2" INTEGER NOT NULL DEFAULT 7,
ADD COLUMN     "prazoPerdido" INTEGER NOT NULL DEFAULT 15;

-- AlterTable
ALTER TABLE "Orcamento" ALTER COLUMN "token" SET DEFAULT replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '');

-- CreateTable
CREATE TABLE "Cobranca" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "orcamentoId" TEXT NOT NULL,
    "etapa" INTEGER NOT NULL,
    "mensagem" TEXT NOT NULL,
    "enviadaEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Cobranca_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Cobranca_orcamentoId_etapa_key" ON "Cobranca"("orcamentoId", "etapa");

-- AddForeignKey
ALTER TABLE "Cobranca" ADD CONSTRAINT "Cobranca_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cobranca" ADD CONSTRAINT "Cobranca_orcamentoId_fkey" FOREIGN KEY ("orcamentoId") REFERENCES "Orcamento"("id") ON DELETE CASCADE ON UPDATE CASCADE;
