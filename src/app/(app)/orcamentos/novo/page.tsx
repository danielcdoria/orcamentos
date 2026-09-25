import Link from "next/link";
import { exigirSessao } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { FormOrcamento } from "./form-orcamento";

export default async function NovoOrcamento() {
  const { empresaId } = await exigirSessao();

  // O catálogo inteiro vai para o navegador, para a busca ser instantânea.
  // Para catálogos de pequenas empresas (algumas centenas de itens) isso é leve.
  const [clientes, catalogo] = await Promise.all([
    prisma.cliente.findMany({
      where: { empresaId },
      orderBy: { nome: "asc" },
      select: { id: true, nome: true },
    }),
    prisma.item.findMany({
      where: { empresaId },
      orderBy: { descricao: "asc" },
      select: { id: true, descricao: true, preco: true, unidade: true },
    }),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold">Novo orçamento</h1>

      {clientes.length === 0 || catalogo.length === 0 ? (
        <p className="text-gray-600">
          Para criar um orçamento, cadastre antes pelo menos{" "}
          {clientes.length === 0 && (
            <Link href="/clientes/novo" className="underline">
              um cliente
            </Link>
          )}
          {clientes.length === 0 && catalogo.length === 0 && " e "}
          {catalogo.length === 0 && (
            <Link href="/catalogo/novo" className="underline">
              um item no catálogo
            </Link>
          )}
          .
        </p>
      ) : (
        <FormOrcamento clientes={clientes} catalogo={catalogo} />
      )}
    </div>
  );
}
