import Link from "next/link";
import { notFound } from "next/navigation";
import { exigirSessao } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatarCentavos } from "@/lib/dinheiro";
import { formatarData, formatarQuantidade } from "@/lib/formatos";
import { urlBase } from "@/lib/url";
import { estiloBotao, estiloBotaoSecundario } from "@/components/estilos";

const rotuloStatus = { rascunho: "Rascunho", enviado: "Enviado" } as const;

// Tela INTERNA de um orçamento (exige login). Daqui se abre a página pública.
export default async function DetalheOrcamento(props: PageProps<"/orcamentos/[id]">) {
  const { id } = await props.params;
  const { empresaId } = await exigirSessao();

  const o = await prisma.orcamento.findFirst({
    where: { id, empresaId },
    include: {
      cliente: { select: { nome: true, telefone: true } },
      itens: { orderBy: { id: "asc" } },
    },
  });
  if (!o) notFound();

  const linkPublico = `${await urlBase()}/orcamento/${o.token}`;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/orcamentos" className="text-sm text-gray-600 hover:text-gray-900">
          ← Orçamentos
        </Link>
        <h1 className="mt-2 text-2xl font-bold">Orçamento nº {o.numero}</h1>
        <p className="mt-1 text-gray-600">
          {o.cliente.nome} · {formatarData(o.criadoEm)} · {rotuloStatus[o.status]}
        </p>
      </div>

      <div className="flex items-center justify-between rounded-lg bg-gray-100 px-4 py-4">
        <span className="font-medium">Total</span>
        <span className="text-xl font-bold">{formatarCentavos(o.total)}</span>
      </div>

      <ul className="divide-y divide-gray-200 rounded-lg border border-gray-200">
        {o.itens.map((item) => (
          <li key={item.id} className="flex items-start justify-between gap-4 px-5 py-3">
            <div className="min-w-0">
              <span className="block">{item.descricao}</span>
              <span className="block text-sm text-gray-600">
                {formatarQuantidade(item.quantidade)} × {formatarCentavos(item.precoUnitario)}
              </span>
            </div>
            <span className="shrink-0">{formatarCentavos(item.subtotal)}</span>
          </li>
        ))}
      </ul>

      {o.observacao && (
        <div>
          <h2 className="text-sm font-medium text-gray-700">Observação</h2>
          <p className="mt-1 whitespace-pre-line">{o.observacao}</p>
        </div>
      )}

      <div className="flex flex-col gap-3">
        {/* <a> comum (e não <Link>) de propósito: o <Link> do Next "pré-carrega" a página
            em segundo plano, e isso contaria como se o cliente tivesse aberto. */}
        <a href={linkPublico} target="_blank" rel="noopener" className={estiloBotao}>
          Ver como o cliente vê
        </a>
        <p className="break-all text-center text-xs text-gray-500">{linkPublico}</p>
      </div>

      <Link href="/orcamentos/novo" className={estiloBotaoSecundario}>
        + Novo orçamento
      </Link>
    </div>
  );
}
