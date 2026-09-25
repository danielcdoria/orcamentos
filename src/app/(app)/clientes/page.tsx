import Link from "next/link";
import { exigirSessao } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { estiloBotao } from "@/components/estilos";
import { formatarTelefone } from "@/lib/telefone";

export default async function PaginaClientes() {
  const { empresaId } = await exigirSessao();

  const clientes = await prisma.cliente.findMany({
    where: { empresaId },
    orderBy: { nome: "asc" },
    select: { id: true, nome: true, telefone: true },
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Clientes</h1>
        <Link href="/clientes/novo" className={`${estiloBotao} py-2`}>
          + Novo
        </Link>
      </div>

      {clientes.length === 0 ? (
        <p className="text-gray-600">Nenhum cliente ainda. Toque em “+ Novo” para cadastrar.</p>
      ) : (
        <ul className="divide-y divide-gray-200 rounded-lg border border-gray-200">
          {clientes.map((c) => (
            <li key={c.id}>
              <Link href={`/clientes/${c.id}`} className="block px-5 py-4 hover:bg-gray-50">
                <span className="block font-medium">{c.nome}</span>
                {c.telefone && <span className="mt-0.5 block text-sm text-gray-600">{formatarTelefone(c.telefone)}</span>}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
