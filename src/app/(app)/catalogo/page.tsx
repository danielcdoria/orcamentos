import Link from "next/link";
import { exigirSessao } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatarCentavos } from "@/lib/dinheiro";
import { estiloBotao, estiloCampo } from "@/components/estilos";

// A busca usa o próprio endereço: /catalogo?busca=lona
// Assim ela funciona sem JavaScript e dá para voltar com o botão do navegador.
export default async function PaginaCatalogo(props: PageProps<"/catalogo">) {
  const { empresaId } = await exigirSessao();
  const { busca } = await props.searchParams;
  const termo = typeof busca === "string" ? busca.trim() : "";

  const itens = await prisma.item.findMany({
    where: {
      empresaId,
      ...(termo && { descricao: { contains: termo, mode: "insensitive" } }),
    },
    orderBy: { descricao: "asc" },
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Catálogo</h1>
        <Link href="/catalogo/novo" className={`${estiloBotao} py-2`}>
          + Novo
        </Link>
      </div>

      <form className="flex gap-2">
        <input
          name="busca"
          type="search"
          placeholder="Buscar item..."
          defaultValue={termo}
          className={estiloCampo}
        />
        <button type="submit" className="rounded-lg border border-gray-300 px-4">
          Buscar
        </button>
      </form>

      {itens.length === 0 ? (
        <p className="text-gray-600">
          {termo ? `Nenhum item com “${termo}”.` : "Nenhum item ainda. Toque em “+ Novo” para cadastrar."}
        </p>
      ) : (
        <ul className="divide-y divide-gray-200 rounded-lg border border-gray-200">
          {itens.map((item) => (
            <li key={item.id}>
              <Link href={`/catalogo/${item.id}`} className="flex items-center justify-between gap-4 px-5 py-4 hover:bg-gray-50">
                <span className="font-medium">{item.descricao}</span>
                <span className="shrink-0 text-sm text-gray-600">
                  {formatarCentavos(item.preco)}/{item.unidade}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
