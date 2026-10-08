import Link from "next/link";
import { BellRing, ChevronRight, FileText, Plus } from "lucide-react";
import { exigirSessao } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatarCentavos } from "@/lib/dinheiro";
import { formatarData } from "@/lib/formatos";
import { contarFila } from "@/lib/cobranca";
import { clienteBate, normalizar } from "@/lib/busca";
import { LISTA_STATUS, STATUS } from "@/lib/status";
import type { Prisma } from "@/generated/prisma/client";
import type { StatusOrcamento } from "@/generated/prisma/enums";
import { estiloBotao, estiloBotaoSecundario, estiloCartao, estiloTitulo } from "@/components/estilos";
import { SeletorStatus } from "@/components/seletor-status";
import { EstadoVazio } from "@/components/estado-vazio";
import { BuscaOrcamentos } from "./busca-orcamentos";

const POR_PAGINA = 100;
// Rascunho e Aberto quase não aparecem no uso de prospecção: só ganham pílula se houver algum.
const SO_SE_TIVER: StatusOrcamento[] = ["rascunho", "aberto"];

// Endereço da lista mantendo a busca: /orcamentos?busca=lumiar&status=enviado
function enderecoLista(busca: string, status?: StatusOrcamento, limite?: number) {
  const p = new URLSearchParams();
  if (busca) p.set("busca", busca);
  if (status) p.set("status", status);
  if (limite) p.set("limite", String(limite));
  const qs = p.toString();
  return qs ? `/orcamentos?${qs}` : "/orcamentos";
}

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

// Busca e filtro rodam no SERVIDOR, pelo endereço (?busca=, ?status=, ?limite=), para o
// limite de 100 por vez nunca esconder resultado: as contagens são do banco inteiro.
export default async function PaginaOrcamentos(props: PageProps<"/orcamentos">) {
  const { empresaId } = await exigirSessao();
  const params = await props.searchParams;
  const busca = typeof params.busca === "string" ? params.busca.trim().slice(0, 100) : "";
  const status = LISTA_STATUS.find((s) => s === params.status);
  const limiteLido = Number(params.limite);
  const limite = Number.isInteger(limiteLido) && limiteLido > POR_PAGINA ? Math.min(limiteLido, 5000) : POR_PAGINA;

  // Conta ANTES de buscar a lista: a contagem também marca como perdido quem passou
  // do prazo, e assim a lista já aparece com o status certo.
  const paraCobrar = await contarFila(empresaId);

  // Busca pelo nome do cliente (sem acento: o banco não sabe ignorar acentos, então a
  // comparação é feita aqui, só entre os clientes DESTA empresa) ou pelo número do orçamento.
  let filtroBusca: Prisma.OrcamentoWhereInput = {};
  if (normalizar(busca)) {
    const clientes = await prisma.cliente.findMany({
      where: { empresaId },
      select: { id: true, nome: true, telefone: true },
    });
    const ids = clientes.filter((c) => clienteBate(c, busca)).map((c) => c.id);
    const numeroDigitado = busca.replace(/^(n[º°o.]?|#)\s*/i, ""); // aceita "12", "nº 12", "#12"
    const numero = /^\d{1,9}$/.test(numeroDigitado) ? Number(numeroDigitado) : null;
    filtroBusca = { OR: [{ clienteId: { in: ids } }, ...(numero !== null ? [{ numero }] : [])] };
  }
  const filtroBase: Prisma.OrcamentoWhereInput = { empresaId, ...filtroBusca };

  const [porStatus, totalDaEmpresa] = await Promise.all([
    prisma.orcamento.groupBy({ by: ["status"], where: filtroBase, _count: { _all: true } }),
    prisma.orcamento.count({ where: { empresaId } }),
  ]);
  const contagem = Object.fromEntries(porStatus.map((g) => [g.status, g._count._all])) as Partial<
    Record<StatusOrcamento, number>
  >;
  const totalBusca = porStatus.reduce((soma, g) => soma + g._count._all, 0);
  const totalFiltrado = status ? (contagem[status] ?? 0) : totalBusca;

  const orcamentos = await prisma.orcamento.findMany({
    where: { ...filtroBase, ...(status && { status }) },
    orderBy: { criadoEm: "desc" }, // mais recentes primeiro
    take: limite,
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

      {totalDaEmpresa > 0 && (
        <div className="flex flex-col gap-3">
          <BuscaOrcamentos buscaInicial={busca} status={status} />
          {/* Uma linha só: no celular, rola de lado */}
          <nav aria-label="Filtrar por status" className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">

            {[undefined, ...LISTA_STATUS].map((s) => {
              const n = s ? (contagem[s] ?? 0) : totalBusca;
              if (s && SO_SE_TIVER.includes(s) && n === 0 && s !== status) return null;
              const ativo = s === status;
              return (
                <Link
                  key={s ?? "todos"}
                  href={enderecoLista(busca, s)}
                  scroll={false}
                  aria-current={ativo ? "page" : undefined}
                  className={`flex min-h-11 shrink-0 items-center rounded-full px-3.5 text-base font-medium whitespace-nowrap ${
                    ativo ? "bg-gray-900 text-white" : "bg-white text-gray-800 ring-1 ring-gray-300 hover:bg-gray-50"
                  }`}
                >
                  {s ? STATUS[s].rotulo.replace(" ✓", "") : "Todos"} ({n})
                </Link>
              );
            })}
          </nav>
        </div>
      )}

      {totalDaEmpresa === 0 ? (
        <EstadoVazio
          icone={FileText}
          titulo="Nenhum orçamento ainda"
          texto="Toque em “Novo orçamento”, escolha o cliente e os itens. Em um minuto ele está pronto para mandar no WhatsApp."
        />
      ) : orcamentos.length === 0 ? (
        <div className={`${estiloCartao} flex flex-col items-center gap-3 px-6 py-8 text-center`}>
          <p className="text-base text-gray-700">
            Nenhum orçamento{busca ? ` com “${busca}”` : ""}
            {status ? ` em ${STATUS[status].rotulo.replace(" ✓", "")}` : ""}.
          </p>
          <Link href="/orcamentos" className={`${estiloBotaoSecundario} w-full max-w-xs`}>
            Ver todos
          </Link>
        </div>
      ) : (
        <>
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
        {totalFiltrado > orcamentos.length && (
          <div className="flex flex-col items-center gap-3">
            <p className="text-sm text-gray-600">
              Mostrando {orcamentos.length} de {totalFiltrado}
            </p>
            <Link
              href={enderecoLista(busca, status, limite + POR_PAGINA * 2)}
              scroll={false}
              className={`${estiloBotaoSecundario} w-full max-w-xs`}
            >
              Mostrar mais
            </Link>
          </div>
        )}
        </>
      )}
    </div>
  );
}
