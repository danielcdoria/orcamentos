import Link from "next/link";

// Mostrada quando o endereço não existe (ou é de outra empresa).
export default function NaoEncontrado() {
  return (
    <main className="mx-auto flex max-w-sm flex-col items-center gap-4 px-4 py-16 text-center">
      <h1 className="text-xl font-bold">Página não encontrada</h1>
      <p className="text-gray-600">O endereço não existe ou foi apagado.</p>
      <Link href="/" className="underline">
        Voltar para o início
      </Link>
    </main>
  );
}
