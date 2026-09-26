import { FormItem } from "../form-item";
import { estiloTitulo } from "@/components/estilos";

export default function NovoItem() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className={estiloTitulo}>Novo item</h1>
      <FormItem />
    </div>
  );
}
