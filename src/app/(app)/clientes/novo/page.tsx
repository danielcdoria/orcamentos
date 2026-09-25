import { FormCliente } from "../form-cliente";

export default function NovoCliente() {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-bold">Novo cliente</h1>
      <FormCliente />
    </div>
  );
}
