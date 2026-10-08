import Link from "next/link";
import { Plus, Users } from "lucide-react";
import { exigirSessao } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { estiloBotao, estiloTitulo } from "@/components/estilos";
import { EstadoVazio } from "@/components/estado-vazio";
import { Aviso } from "@/components/aviso";
import { ListaClientes } from "./lista-clientes";

export default async function PaginaClientes(props: PageProps<"/clientes">) {
  const { empresaId } = await exigirSessao();
  const { ok } = await props.searchParams;

  const clientes = await prisma.cliente.findMany({
    where: { empresaId },
    orderBy: { nome: "asc" },
    select: {
      id: true,
      nome: true,
      telefone: true,
      observacao: true,
      cidade: true,
      abordagem: true,
      notaGoogle: true,
    },
  });

  return (
    <div className="flex flex-col gap-6">
      <h1 className={estiloTitulo}>Clientes</h1>

      <Link href="/clientes/novo" className={`${estiloBotao} w-full text-lg`}>
        <Plus className="size-5" aria-hidden />
        Novo cliente
      </Link>

      <Aviso codigo={ok} />

      {clientes.length === 0 ? (
        <EstadoVazio
          icone={Users}
          titulo="Nenhum cliente ainda"
          texto="Cadastre o nome e o WhatsApp de quem pede orçamento. Assim o orçamento vai direto para a conversa da pessoa."
        />
      ) : (
        <ListaClientes clientes={clientes} />
      )}
    </div>
  );
}
