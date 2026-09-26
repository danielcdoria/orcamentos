import { redirect } from "next/navigation";

// A página inicial é o painel.
export default function Inicio() {
  redirect("/painel");
}
