import Link from "next/link";
import { ChevronRight, Plus, Users } from "lucide-react";
import { exigirSessao } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatarTelefone } from "@/lib/telefone";
import { estiloBotao, estiloCartao, estiloTitulo } from "@/components/estilos";
import { EstadoVazio } from "@/components/estado-vazio";
import { Aviso } from "@/components/aviso";

export default async function PaginaClientes(props: PageProps<"/clientes">) {
  const { empresaId } = await exigirSessao();
  const { ok } = await props.searchParams;

  const clientes = await prisma.cliente.findMany({
    where: { empresaId },
    orderBy: { nome: "asc" },
    select: { id: true, nome: true, telefone: true, observacao: true },
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
        <ul className={`${estiloCartao} divide-y divide-gray-200`}>
          {clientes.map((c) => (
            <li key={c.id}>
              <Link href={`/clientes/${c.id}`} className="flex min-h-16 items-center gap-3 px-4 py-3 hover:bg-gray-50">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-lg font-semibold">{c.nome}</p>
                  {c.telefone && <p className="text-base text-gray-600">{formatarTelefone(c.telefone)}</p>}
                  {c.observacao && <p className="truncate text-base text-gray-500">{c.observacao}</p>}
                </div>
                <ChevronRight className="size-5 shrink-0 text-gray-400" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
