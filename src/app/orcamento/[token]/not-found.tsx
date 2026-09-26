import { FileQuestion } from "lucide-react";

// Mostrada ao CLIENTE quando o link do orçamento está errado ou incompleto.
// Diferente da página "não encontrada" geral: não tem link para o sistema (login),
// porque o cliente não tem conta.
export default function OrcamentoNaoEncontrado() {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-gray-100 px-4">
      <div className="flex max-w-sm flex-col items-center gap-3 rounded-2xl border border-gray-200 bg-white px-6 py-10 text-center">
        <FileQuestion className="size-10 text-gray-400" aria-hidden strokeWidth={1.5} />
        <h1 className="text-xl font-bold">Orçamento não encontrado</h1>
        <p className="text-base text-gray-600">
          Confira se o link está completo. Se o problema continuar, peça um novo link para quem
          enviou o orçamento.
        </p>
      </div>
    </main>
  );
}
