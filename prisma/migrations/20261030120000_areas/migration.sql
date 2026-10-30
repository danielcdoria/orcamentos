-- CreateEnum
CREATE TYPE "Area" AS ENUM ('pousada', 'marcenaria');

-- AlterTable
ALTER TABLE "Empresa" ADD COLUMN     "usaAreas" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Cliente" ADD COLUMN     "area" "Area" NOT NULL DEFAULT 'pousada';

-- AlterTable
ALTER TABLE "Item" ADD COLUMN     "area" "Area" NOT NULL DEFAULT 'pousada';

-- Liga as áreas na empresa de sites (Doria Works). As outras continuam vendo tudo junto.
UPDATE "Empresa" SET "usaAreas" = true WHERE "nome" ILIKE 'Sites Personalizad%';
