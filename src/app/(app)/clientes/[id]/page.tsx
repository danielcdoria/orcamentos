import { notFound } from "next/navigation";
import { exigirSessao } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { FormCliente } from "../form-cliente";
import { estiloTitulo } from "@/components/estilos";
import { ContatoCliente } from "@/components/contato-cliente";

// [id] entre colchetes = parte variável do endereço. /clientes/abc123 -> id = "abc123"
export default async function EditarCliente(props: PageProps<"/clientes/[id]">) {
  const { id } = await props.params;
  const { empresaId } = await exigirSessao();

  // findFirst com empresaId: um cliente de outra empresa simplesmente "não existe" aqui.
  const [cliente, outros] = await Promise.all([
    prisma.cliente.findFirst({
      where: { id, empresaId },
      select: {
        id: true,
        nome: true,
        telefone: true,
        observacao: true,
        cidade: true,
        abordagem: true,
        linkDemo: true,
        instagram: true,
        notaGoogle: true,
        avaliacoesGoogle: true,
      },
    }),
    // Os outros clientes desta empresa, para avisar de nome ou telefone repetido
    prisma.cliente.findMany({
      where: { empresaId, id: { not: id } },
      select: { id: true, nome: true, telefone: true },
    }),
  ]);
  if (!cliente) notFound();

  return (
    <div className="flex flex-col gap-6">
      <h1 className={estiloTitulo}>Editar cliente</h1>
      <ContatoCliente nome={cliente.nome} telefone={cliente.telefone} linkDemo={cliente.linkDemo} />
      <FormCliente cliente={cliente} outros={outros} />
    </div>
  );
}
