import { FormCliente } from "../form-cliente";

export default function NovoCliente() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold">Novo cliente</h1>
      <FormCliente />
    </div>
  );
}
