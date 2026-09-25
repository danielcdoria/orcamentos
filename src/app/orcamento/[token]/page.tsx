import { cache } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { after } from "next/server";
import { registrarAbertura, visitaContaComoAbertura } from "@/lib/abertura";
import { prisma } from "@/lib/prisma";
import { formatarCentavos } from "@/lib/dinheiro";
import { formatarData, formatarQuantidade } from "@/lib/formatos";

// PÁGINA PÚBLICA do orçamento: /orcamento/<token>
// Fica FORA da pasta (app), então não exige login. Quem tem o link, vê.
// A segurança está no token: 64 caracteres aleatórios, impossível de adivinhar.

// cache(): a busca roda uma vez só, mesmo sendo usada pelo título (generateMetadata) e pela página.
const buscarOrcamento = cache(async (token: string) => {
  if (!/^[a-f0-9]{64}$/.test(token)) return null; // nem consulta o banco se o formato for inválido
  return prisma.orcamento.findUnique({
    where: { token },
    include: {
      empresa: {
        select: { nome: true, telefone: true, logoUrl: true, condicaoPagamento: true },
      },
      cliente: { select: { nome: true, telefone: true } },
      itens: { orderBy: { id: "asc" } },
    },
  });
});

// Título e descrição que aparecem na prévia do link no WhatsApp.
export async function generateMetadata(props: PageProps<"/orcamento/[token]">): Promise<Metadata> {
  const { token } = await props.params;
  const o = await buscarOrcamento(token);
  if (!o) return { title: "Orçamento não encontrado" };

  const titulo = `Orçamento nº ${o.numero} · ${o.empresa.nome}`;
  const descricao = `Para ${o.cliente.nome} · Total ${formatarCentavos(o.total)} · Válido até ${formatarData(o.validoAte)}`;
  return {
    title: titulo,
    description: descricao,
    openGraph: { title: titulo, description: descricao, type: "website" },
    robots: { index: false, follow: false }, // não aparecer no Google
  };
}

export default async function OrcamentoPublico(props: PageProps<"/orcamento/[token]">) {
  const { token } = await props.params;
  const o = await buscarOrcamento(token);
  if (!o) notFound();

  // after(): grava a abertura DEPOIS de enviar a página, para não deixá-la mais lenta.
  if (await visitaContaComoAbertura(o.empresaId)) {
    after(() => registrarAbertura(o.id));
  }

  const vencido = o.validoAte < new Date();

  return (
    <main className="min-h-dvh bg-gray-100 px-3 py-4 sm:px-6 sm:py-10">
      <article className="mx-auto max-w-2xl overflow-hidden rounded-2xl bg-white shadow-sm">
        {/* Empresa */}
        <header className="flex items-center gap-4 border-b border-gray-100 px-5 py-6 sm:px-8">
          {o.empresa.logoUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={o.empresa.logoUrl}
              alt={`Logo ${o.empresa.nome}`}
              className="h-14 w-14 shrink-0 rounded-lg object-contain"
            />
          )}
          <div className="min-w-0">
            <p className="text-lg font-bold leading-tight">{o.empresa.nome}</p>
            {o.empresa.telefone && <p className="text-sm text-gray-600">{o.empresa.telefone}</p>}
          </div>
        </header>

        {/* Cabeçalho do orçamento */}
        <section className="px-5 pt-6 sm:px-8">
          <p className="text-xs font-semibold tracking-widest text-gray-500 uppercase">Orçamento</p>
          <h1 className="text-3xl font-bold">Nº {o.numero}</h1>

          <dl className="mt-5 grid grid-cols-2 gap-4 text-sm">
            <div>
              <dt className="text-gray-500">Data</dt>
              <dd className="font-medium">{formatarData(o.criadoEm)}</dd>
            </div>
            <div>
              <dt className="text-gray-500">Válido até</dt>
              <dd className={`font-medium ${vencido ? "text-red-700" : ""}`}>
                {formatarData(o.validoAte)}
                {vencido && " (vencido)"}
              </dd>
            </div>
            <div className="col-span-2">
              <dt className="text-gray-500">Cliente</dt>
              <dd className="font-medium">
                {o.cliente.nome}
                {o.cliente.telefone && (
                  <span className="font-normal text-gray-600"> · {o.cliente.telefone}</span>
                )}
              </dd>
            </div>
          </dl>
        </section>

        {/* Itens */}
        <section className="px-5 pt-8 sm:px-8">
          <h2 className="border-b border-gray-200 pb-2 text-xs font-semibold tracking-widest text-gray-500 uppercase">
            Itens
          </h2>
          <ul className="divide-y divide-gray-100">
            {o.itens.map((item) => (
              <li key={item.id} className="flex items-start justify-between gap-4 py-4">
                <div className="min-w-0">
                  <p className="font-medium">{item.descricao}</p>
                  <p className="mt-0.5 text-sm text-gray-600">
                    {formatarQuantidade(item.quantidade)} × {formatarCentavos(item.precoUnitario)}
                  </p>
                </div>
                <p className="shrink-0 font-medium tabular-nums">{formatarCentavos(item.subtotal)}</p>
              </li>
            ))}
          </ul>
        </section>

        {/* Total */}
        <section className="mx-5 mt-2 flex items-center justify-between rounded-xl bg-gray-900 px-5 py-5 text-white sm:mx-8">
          <span className="font-medium">Total</span>
          <span className="text-2xl font-bold tabular-nums">{formatarCentavos(o.total)}</span>
        </section>

        {/* Condições */}
        <section className="flex flex-col gap-4 px-5 py-8 text-sm sm:px-8">
          {o.empresa.condicaoPagamento && (
            <div>
              <h2 className="font-semibold">Condição de pagamento</h2>
              <p className="mt-1 whitespace-pre-line text-gray-700">{o.empresa.condicaoPagamento}</p>
            </div>
          )}
          <div>
            <h2 className="font-semibold">Validade</h2>
            <p className="mt-1 text-gray-700">
              Este orçamento é válido até {formatarData(o.validoAte)}.
            </p>
          </div>
          {o.observacao && (
            <div>
              <h2 className="font-semibold">Observações</h2>
              <p className="mt-1 whitespace-pre-line text-gray-700">{o.observacao}</p>
            </div>
          )}
        </section>
      </article>
    </main>
  );
}
