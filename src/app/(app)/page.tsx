import { redirect } from "next/navigation";

// A página inicial é a lista de orçamentos.
export default function Inicio() {
  redirect("/orcamentos");
}
