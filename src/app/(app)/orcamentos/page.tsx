import Link from "next/link";
import { exigirSessao } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatarCentavos } from "@/lib/dinheiro";
import { formatarData } from "@/lib/formatos";
import { estiloBotao } from "@/components/estilos";
import { SeletorStatus } from "@/components/seletor-status";

// "Visto" em verde forte quando o cliente já abriu; "Não visto" em cinza quando não.
function SeloAbertura({ abertoEm, vezes }: { abertoEm: Date | null; vezes: number }) {
  if (!abertoEm) {
    return (
      <span className="shrink-0 rounded-full border border-gray-300 px-2 py-0.5 text-xs text-gray-600">
        Não visto
      </span>
    );
  }
  return (
    <span className="shrink-0 rounded-full bg-green-700 px-2 py-0.5 text-xs font-semibold text-white">
      Visto{vezes > 1 ? ` ${vezes}x` : ""}
    </span>
  );
}

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
      abertoEm: true,
      vezesAberto: true,
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
            <li key={o.id} className="flex flex-col gap-2 px-5 py-4 hover:bg-gray-50">
              <Link href={`/orcamentos/${o.id}`} className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <span className="flex items-center gap-2">
                    <span className="truncate font-medium">{o.cliente.nome}</span>
                    <SeloAbertura abertoEm={o.abertoEm} vezes={o.vezesAberto} />
                  </span>
                  <span className="mt-0.5 block text-sm text-gray-600">
                    Nº {o.numero} · {formatarData(o.criadoEm)}
                  </span>
                </div>
                <span className="shrink-0 font-semibold">{formatarCentavos(o.total)}</span>
              </Link>
              {/* Fora do link: mudar o status aqui não abre o orçamento */}
              <div>
                <SeletorStatus id={o.id} status={o.status} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
