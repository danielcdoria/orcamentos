import { estiloTitulo } from "@/components/estilos";
import { FormCliente } from "../form-cliente";

export default async function NovoCliente(props: PageProps<"/clientes/novo">) {
  const { voltar } = await props.searchParams;
  return (
    <div className="flex flex-col gap-6">
      <h1 className={estiloTitulo}>Novo cliente</h1>
      <FormCliente voltar={voltar === "orcamento" ? "orcamento" : undefined} />
    </div>
  );
}
