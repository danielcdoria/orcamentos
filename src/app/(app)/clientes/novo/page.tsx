import { estiloTitulo } from "@/components/estilos";
import { FormCliente } from "../form-cliente";

export default async function NovoCliente(props: PageProps<"/clientes/novo">) {
  const { voltar, nome } = await props.searchParams;
  // ?nome= vem da busca ("Cadastrar “Pousada X”"): só preenche o campo, a pessoa confere.
  const nomeInicial = typeof nome === "string" ? nome.trim().slice(0, 120) : undefined;
  return (
    <div className="flex flex-col gap-6">
      <h1 className={estiloTitulo}>Novo cliente</h1>
      <FormCliente voltar={voltar === "orcamento" ? "orcamento" : undefined} nomeInicial={nomeInicial} />
    </div>
  );
}
