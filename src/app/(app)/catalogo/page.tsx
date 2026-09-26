import Link from "next/link";
import { ChevronRight, Package, Plus, Search } from "lucide-react";
import { exigirSessao } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatarCentavos } from "@/lib/dinheiro";
import { estiloBotao, estiloBotaoSecundario, estiloCampo, estiloCartao, estiloTitulo } from "@/components/estilos";
import { EstadoVazio } from "@/components/estado-vazio";
import { Aviso } from "@/components/aviso";

// A busca usa o próprio endereço: /catalogo?busca=lona
// Assim ela funciona sem JavaScript e dá para voltar com o botão do navegador.
export default async function PaginaCatalogo(props: PageProps<"/catalogo">) {
  const { empresaId } = await exigirSessao();
  const { busca, ok } = await props.searchParams;
  const termo = typeof busca === "string" ? busca.trim() : "";

  const [itens, totalNoCatalogo] = await Promise.all([
    prisma.item.findMany({
      where: {
        empresaId,
        ...(termo && { descricao: { contains: termo, mode: "insensitive" } }),
      },
      orderBy: { descricao: "asc" },
    }),
    prisma.item.count({ where: { empresaId } }),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className={estiloTitulo}>Catálogo</h1>
        <p className="mt-1 text-base text-gray-600">Os produtos e serviços que você vende, com o preço.</p>
      </div>

      <Link href="/catalogo/novo" className={`${estiloBotao} w-full text-lg`}>
        <Plus className="size-5" aria-hidden />
        Novo item
      </Link>

      <Aviso codigo={ok} />

      {totalNoCatalogo === 0 ? (
        <EstadoVazio
          icone={Package}
          titulo="Seu catálogo está vazio"
          texto="Cadastre o que você mais vende (ex.: troca de óleo, banner, porta de cozinha) com o preço. Depois é só escolher na hora de fazer o orçamento."
        />
      ) : (
        <>
          <form className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-gray-400" aria-hidden />
            <input
              name="busca"
              type="search"
              placeholder="Procurar no catálogo"
              defaultValue={termo}
              aria-label="Procurar no catálogo"
              className={`${estiloCampo} pl-12`}
            />
          </form>

          {itens.length === 0 ? (
            <div className={`${estiloCartao} flex flex-col items-center gap-3 px-6 py-8 text-center`}>
              <p className="text-base text-gray-700">Nada com “{termo}” no catálogo.</p>
              <div className="flex w-full max-w-xs flex-col gap-3">
                <Link href="/catalogo/novo" className={estiloBotao}>
                  Cadastrar item
                </Link>
                <Link href="/catalogo" className={estiloBotaoSecundario}>
                  Ver tudo
                </Link>
              </div>
            </div>
          ) : (
            <ul className={`${estiloCartao} divide-y divide-gray-200`}>
              {itens.map((item) => (
                <li key={item.id}>
                  <Link href={`/catalogo/${item.id}`} className="flex min-h-16 items-center gap-3 px-4 py-3 hover:bg-gray-50">
                    <span className="min-w-0 flex-1 text-base font-medium">{item.descricao}</span>
                    <span className="shrink-0 text-right">
                      <span className="block text-base font-bold">{formatarCentavos(item.preco)}</span>
                      <span className="block text-sm text-gray-500">por {item.unidade}</span>
                    </span>
                    <ChevronRight className="size-5 shrink-0 text-gray-400" aria-hidden />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
