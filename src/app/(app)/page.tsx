import { redirect } from "next/navigation";

// A página inicial é "Hoje" (primeiro item do menu): o que fazer hoje nas negociações.
export default function Inicio() {
  redirect("/hoje");
}
