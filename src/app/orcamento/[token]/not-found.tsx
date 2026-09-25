// Mostrada ao CLIENTE quando o link do orçamento está errado ou incompleto.
// Diferente da página "não encontrada" geral: não tem link para o sistema (login),
// porque o cliente não tem conta.
export default function OrcamentoNaoEncontrado() {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-gray-100 px-4">
      <div className="max-w-sm rounded-2xl bg-white px-6 py-10 text-center shadow-sm">
        <h1 className="text-xl font-bold">Orçamento não encontrado</h1>
        <p className="mt-3 text-gray-600">
          Confira se o link está completo. Se o problema continuar, peça um novo link para quem
          enviou o orçamento.
        </p>
      </div>
    </main>
  );
}
