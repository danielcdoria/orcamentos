import { redirect } from "next/navigation";

// A página inicial é a lista de orçamentos (primeiro item do menu).
export default function Inicio() {
  redirect("/orcamentos");
}
