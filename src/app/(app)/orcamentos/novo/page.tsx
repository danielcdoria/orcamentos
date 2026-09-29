import { Package, UserPlus } from "lucide-react";
import { exigirSessao } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { estiloTitulo } from "@/components/estilos";
import { EstadoVazio } from "@/components/estado-vazio";
import { FormOrcamento } from "./form-orcamento";

export default async function NovoOrcamento(props: PageProps<"/orcamentos/novo">) {
  const { empresaId } = await exigirSessao();
  const { cliente } = await props.searchParams; // vem preenchido quando o cliente acabou de ser cadastrado

  // O catálogo inteiro vai para o navegador, para a busca ser instantânea.
  // Para catálogos de pequenas empresas (algumas centenas de itens) isso é leve.
  const [clientes, catalogo] = await Promise.all([
    prisma.cliente.findMany({
      where: { empresaId },
      orderBy: { nome: "asc" },
      select: { id: true, nome: true },
    }),
    prisma.item.findMany({
      where: { empresaId },
      orderBy: { descricao: "asc" },
      select: { id: true, descricao: true, preco: true, unidade: true, custo: true },
    }),
  ]);

  const clienteInicial =
    typeof cliente === "string" && clientes.some((c) => c.id === cliente) ? cliente : "";

  return (
    <div className="flex flex-col gap-6">
      <h1 className={estiloTitulo}>Novo orçamento</h1>

      {clientes.length === 0 ? (
        <EstadoVazio
          icone={UserPlus}
          titulo="Primeiro, cadastre um cliente"
          texto="O orçamento precisa ser para alguém. Cadastre o cliente (nome e telefone) e volte aqui."
          botao="Cadastrar cliente"
          href="/clientes/novo?voltar=orcamento"
        />
      ) : catalogo.length === 0 ? (
        <EstadoVazio
          icone={Package}
          titulo="Primeiro, cadastre o que você vende"
          texto="Os itens do orçamento vêm do seu catálogo de produtos e serviços, com o preço. Cadastre pelo menos um."
          botao="Cadastrar item"
          href="/catalogo/novo"
        />
      ) : (
        <FormOrcamento clientes={clientes} catalogo={catalogo} clienteInicial={clienteInicial} />
      )}
    </div>
  );
}
