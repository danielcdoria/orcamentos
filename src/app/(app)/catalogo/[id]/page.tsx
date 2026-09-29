import { notFound } from "next/navigation";
import { exigirSessao } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { centavosParaTexto } from "@/lib/dinheiro";
import { FormItem } from "../form-item";
import { estiloTitulo } from "@/components/estilos";

export default async function EditarItem(props: PageProps<"/catalogo/[id]">) {
  const { id } = await props.params;
  const { empresaId } = await exigirSessao();

  const item = await prisma.item.findFirst({ where: { id, empresaId } });
  if (!item) notFound();

  return (
    <div className="flex flex-col gap-6">
      <h1 className={estiloTitulo}>Editar item</h1>
      <FormItem
        item={{
          id: item.id,
          descricao: item.descricao,
          unidade: item.unidade,
          precoTexto: centavosParaTexto(item.preco),
          custoTexto: item.custo !== null ? centavosParaTexto(item.custo) : "",
        }}
      />
    </div>
  );
}
