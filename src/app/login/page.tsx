import { redirect } from "next/navigation";
import { lerSessao } from "@/lib/sessao";
import { FormLogin } from "./form-login";

export default async function PaginaLogin() {
  // Quem já está logado não precisa ver a tela de login.
  if (await lerSessao()) redirect("/");

  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center px-4 py-10">
      <h1 className="mb-6 text-2xl font-bold">Entrar</h1>
      <FormLogin />
    </main>
  );
}
