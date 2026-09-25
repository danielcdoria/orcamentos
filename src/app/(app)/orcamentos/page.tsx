import Link from "next/link";
import { exigirSessao } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatarCentavos } from "@/lib/dinheiro";
import { formatarData } from "@/lib/formatos";
import { estiloBotao } from "@/components/estilos";

const rotuloStatus = { rascunho: "Rascunho", enviado: "Enviado" } as const;

export default async function PaginaOrcamentos() {
  const { empresaId } = await exigirSessao();

  const orcamentos = await prisma.orcamento.findMany({
    where: { empresaId },
    orderBy: { criadoEm: "desc" }, // mais recentes primeiro
    take: 100,
    select: {
      id: true,
      numero: true,
      total: true,
      status: true,
      criadoEm: true,
      cliente: { select: { nome: true } },
    },
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Orçamentos</h1>
        <Link href="/orcamentos/novo" className={`${estiloBotao} py-2`}>
          + Novo
        </Link>
      </div>

      {orcamentos.length === 0 ? (
        <p className="text-gray-600">Nenhum orçamento ainda. Toque em “+ Novo” para criar o primeiro.</p>
      ) : (
        <ul className="divide-y divide-gray-200 rounded-lg border border-gray-200">
          {orcamentos.map((o) => (
            <li key={o.id}>
              <Link
                href={`/orcamentos/${o.id}`}
                className="flex items-center justify-between gap-4 px-5 py-4 hover:bg-gray-50"
              >
              <div className="min-w-0">
                <span className="block truncate font-medium">{o.cliente.nome}</span>
                <span className="mt-0.5 block text-sm text-gray-600">
                  Nº {o.numero} · {formatarData(o.criadoEm)} · {rotuloStatus[o.status]}
                </span>
              </div>
              <span className="shrink-0 font-semibold">{formatarCentavos(o.total)}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
