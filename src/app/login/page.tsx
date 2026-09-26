import { redirect } from "next/navigation";
import { FileText } from "lucide-react";
import { lerSessao } from "@/lib/sessao";
import { estiloCartao } from "@/components/estilos";
import { FormLogin } from "./form-login";

export default async function PaginaLogin() {
  // Quem já está logado não precisa ver a tela de login.
  if (await lerSessao()) redirect("/");

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-4 py-10">
      <div className="mb-8 flex flex-col items-center gap-3 text-center">
        <span className="flex size-14 items-center justify-center rounded-2xl bg-marca text-white">
          <FileText className="size-7" aria-hidden />
        </span>
        <h1 className="text-2xl font-bold">Seus orçamentos</h1>
        <p className="text-base text-gray-600">Entre com o email e a senha da sua empresa.</p>
      </div>
      <div className={`${estiloCartao} p-5`}>
        <FormLogin />
      </div>
    </main>
  );
}
