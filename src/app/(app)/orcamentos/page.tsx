import Link from "next/link";
import { BellRing, ChevronRight, FileText, Plus } from "lucide-react";
import { exigirSessao } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatarCentavos } from "@/lib/dinheiro";
import { formatarData } from "@/lib/formatos";
import { contarFila } from "@/lib/cobranca";
import { estiloBotao, estiloCartao, estiloTitulo } from "@/components/estilos";
import { SeletorStatus } from "@/components/seletor-status";
import { EstadoVazio } from "@/components/estado-vazio";

// Selo: o cliente já abriu o link do orçamento?
function SeloAbertura({ abertoEm, vezes }: { abertoEm: Date | null; vezes: number }) {
  if (!abertoEm) {
    return <span className="rounded-full px-2.5 py-0.5 text-sm text-gray-600 ring-1 ring-gray-300">Não viu</span>;
  }
  return (
    <span className="rounded-full bg-green-50 px-2.5 py-0.5 text-sm font-medium text-green-800">
      Viu{vezes > 1 ? ` ${vezes}x` : ""}
    </span>
  );
}

export default async function PaginaOrcamentos() {
  const { empresaId } = await exigirSessao();

  // Conta ANTES de buscar a lista: a contagem também marca como perdido quem passou
  // do prazo, e assim a lista já aparece com o status certo.
  const paraCobrar = await contarFila(empresaId);

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
      <h1 className={estiloTitulo}>Orçamentos</h1>

      <Link href="/orcamentos/novo" className={`${estiloBotao} w-full text-lg`}>
        <Plus className="size-5" aria-hidden />
        Novo orçamento
      </Link>

      {paraCobrar > 0 && (
        <Link
          href="/cobrar"
          className="flex min-h-14 items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-base font-semibold text-amber-900 hover:bg-amber-100"
        >
          <BellRing className="size-5 shrink-0" aria-hidden />
          <span className="flex-1">
            {paraCobrar === 1
              ? "1 cliente esperando cobrança hoje"
              : `${paraCobrar} clientes esperando cobrança hoje`}
          </span>
          <ChevronRight className="size-5 shrink-0" aria-hidden />
        </Link>
      )}

      {orcamentos.length === 0 ? (
        <EstadoVazio
          icone={FileText}
          titulo="Nenhum orçamento ainda"
          texto="Toque em “Novo orçamento”, escolha o cliente e os itens. Em um minuto ele está pronto para mandar no WhatsApp."
        />
      ) : (
        <ul className={`${estiloCartao} divide-y divide-gray-200`}>
          {orcamentos.map((o) => (
            <li key={o.id} className="flex flex-col gap-3 px-4 py-4">
              <Link href={`/orcamentos/${o.id}`} className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="truncate text-lg font-semibold">{o.cliente.nome}</p>
                  <p className="mt-0.5 text-base text-gray-600">
                    Nº {o.numero} · {formatarData(o.criadoEm)}
                  </p>
                </div>
                <p className="shrink-0 text-lg font-bold">{formatarCentavos(o.total)}</p>
              </Link>
              {/* Fora do link: mudar o status aqui não abre o orçamento */}
              <div className="flex flex-wrap items-center gap-2">
                <SeletorStatus id={o.id} status={o.status} />
                {o.status !== "rascunho" && <SeloAbertura abertoEm={o.abertoEm} vezes={o.vezesAberto} />}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
