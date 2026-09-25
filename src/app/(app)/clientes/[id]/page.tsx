import { notFound } from "next/navigation";
import { exigirSessao } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { FormCliente } from "../form-cliente";

// [id] entre colchetes = parte variável do endereço. /clientes/abc123 -> id = "abc123"
export default async function EditarCliente(props: PageProps<"/clientes/[id]">) {
  const { id } = await props.params;
  const { empresaId } = await exigirSessao();

  // findFirst com empresaId: um cliente de outra empresa simplesmente "não existe" aqui.
  const cliente = await prisma.cliente.findFirst({
    where: { id, empresaId },
    select: { id: true, nome: true, telefone: true, observacao: true },
  });
  if (!cliente) notFound();

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-bold">Editar cliente</h1>
      <FormCliente cliente={cliente} />
    </div>
  );
}
