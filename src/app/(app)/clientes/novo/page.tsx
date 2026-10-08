import { exigirSessao } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { estiloTitulo } from "@/components/estilos";
import { FormCliente } from "../form-cliente";

export default async function NovoCliente(props: PageProps<"/clientes/novo">) {
  const { empresaId } = await exigirSessao();
  const { voltar, nome } = await props.searchParams;
  // Os clientes desta empresa, para avisar antes de cadastrar um repetido
  const outros = await prisma.cliente.findMany({
    where: { empresaId },
    select: { id: true, nome: true, telefone: true },
  });
  // ?nome= vem da busca ("Cadastrar “Pousada X”"): só preenche o campo, a pessoa confere.
  const nomeInicial = typeof nome === "string" ? nome.trim().slice(0, 120) : undefined;
  return (
    <div className="flex flex-col gap-6">
      <h1 className={estiloTitulo}>Novo cliente</h1>
      <FormCliente voltar={voltar === "orcamento" ? "orcamento" : undefined} nomeInicial={nomeInicial} outros={outros} />
    </div>
  );
}
