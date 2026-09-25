-- CreateEnum
CREATE TYPE "StatusOrcamento" AS ENUM ('rascunho', 'enviado');

-- CreateTable
CREATE TABLE "Empresa" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "logoUrl" TEXT,
    "telefone" TEXT,
    "condicaoPagamento" TEXT,
    "diasValidade" INTEGER NOT NULL DEFAULT 15,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Empresa_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Cliente" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "telefone" TEXT,
    "observacao" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Cliente_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Item" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "preco" INTEGER NOT NULL,
    "unidade" TEXT NOT NULL,

    CONSTRAINT "Item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Orcamento" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "clienteId" TEXT NOT NULL,
    "numero" INTEGER NOT NULL,
    "total" INTEGER NOT NULL,
    "observacao" TEXT,
    "validoAte" TIMESTAMP(3) NOT NULL,
    "status" "StatusOrcamento" NOT NULL DEFAULT 'rascunho',
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Orcamento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrcamentoItem" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "orcamentoId" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "quantidade" DECIMAL(10,3) NOT NULL,
    "precoUnitario" INTEGER NOT NULL,
    "subtotal" INTEGER NOT NULL,

    CONSTRAINT "OrcamentoItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Cliente_empresaId_nome_idx" ON "Cliente"("empresaId", "nome");

-- CreateIndex
CREATE INDEX "Item_empresaId_descricao_idx" ON "Item"("empresaId", "descricao");

-- CreateIndex
CREATE INDEX "Orcamento_empresaId_criadoEm_idx" ON "Orcamento"("empresaId", "criadoEm");

-- CreateIndex
CREATE UNIQUE INDEX "Orcamento_empresaId_numero_key" ON "Orcamento"("empresaId", "numero");

-- CreateIndex
CREATE INDEX "OrcamentoItem_orcamentoId_idx" ON "OrcamentoItem"("orcamentoId");

-- AddForeignKey
ALTER TABLE "Cliente" ADD CONSTRAINT "Cliente_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Item" ADD CONSTRAINT "Item_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Orcamento" ADD CONSTRAINT "Orcamento_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Orcamento" ADD CONSTRAINT "Orcamento_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrcamentoItem" ADD CONSTRAINT "OrcamentoItem_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrcamentoItem" ADD CONSTRAINT "OrcamentoItem_orcamentoId_fkey" FOREIGN KEY ("orcamentoId") REFERENCES "Orcamento"("id") ON DELETE CASCADE ON UPDATE CASCADE;
