import { exigirSessao } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { filtroArea, areaAtual, AREAS } from "@/lib/area";
import { formatarCentavos } from "@/lib/dinheiro";
import { estiloTitulo } from "@/components/estilos";
import { FormImportar } from "./form-importar";

// IMPORTAR LOTE: colar uma lista e cadastrar todos de uma vez, já como "Enviado".
export default async function Importar() {
  const { empresaId } = await exigirSessao();
  const [itens, area] = await Promise.all([
    prisma.item.findMany({
      where: { empresaId, ...(await filtroArea(empresaId)) },
      orderBy: { descricao: "asc" },
      select: { id: true, descricao: true, preco: true },
    }),
    areaAtual(empresaId),
  ]);
  const nomeArea = AREAS.find((a) => a.valor === area)?.rotulo;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className={estiloTitulo}>Importar lote</h1>
        <p className="mt-1 text-base text-gray-600">
          Cadastra vários clientes de uma vez, cada um com um orçamento já marcado como Enviado.
          {nomeArea && ` Eles entram na área ${nomeArea}.`}
        </p>
      </div>
      <FormImportar itens={itens.map((i) => ({ id: i.id, rotulo: `${i.descricao} · ${formatarCentavos(i.preco)}` }))} />
    </div>
  );
}
