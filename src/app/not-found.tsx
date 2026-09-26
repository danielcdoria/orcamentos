import Link from "next/link";
import { FileQuestion } from "lucide-react";
import { estiloBotao } from "@/components/estilos";

// Mostrada quando o endereço não existe (ou é de outra empresa).
export default function NaoEncontrado() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col items-center justify-center gap-4 px-4 py-16 text-center">
      <FileQuestion className="size-10 text-gray-400" aria-hidden strokeWidth={1.5} />
      <h1 className="text-xl font-bold">Página não encontrada</h1>
      <p className="text-base text-gray-600">Esse endereço não existe ou foi apagado.</p>
      <Link href="/" className={`${estiloBotao} w-full`}>
        Voltar para o início
      </Link>
    </main>
  );
}
