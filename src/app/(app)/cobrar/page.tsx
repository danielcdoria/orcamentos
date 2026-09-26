import { exigirSessao } from "@/lib/auth";
import { buscarFila } from "@/lib/cobranca";
import { urlBase } from "@/lib/url";
import { CartaoCobranca } from "./cartao-cobranca";

// COBRAR HOJE: a tela principal do produto.
// Mostra quem precisa ser cobrado hoje, com a mensagem pronta.
// O sistema NUNCA envia nada sozinho: quem toca em "Enviar" é a pessoa.
export default async function CobrarHoje() {
  const { empresaId } = await exigirSessao();
  const base = await urlBase();
  const fila = await buscarFila(empresaId, (token) => `${base}/orcamento/${token}`);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold">Cobrar hoje</h1>
        <p className="mt-1 text-gray-600">
          {fila.length === 0
            ? "Ninguém para cobrar hoje."
            : fila.length === 1
              ? "1 cliente esperando uma mensagem sua."
              : `${fila.length} clientes esperando uma mensagem sua.`}
        </p>
      </div>

      {fila.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 px-6 py-10 text-center">
          <p className="text-lg font-semibold">Tudo em dia 🎉</p>
          <p className="mt-2 text-sm text-gray-600">
            Quando um orçamento enviado ficar sem resposta, ele aparece aqui no dia certo, com a
            mensagem pronta para mandar.
          </p>
        </div>
      ) : (
        <ul className="flex flex-col gap-4">
          {fila.map((item) => (
            <CartaoCobranca key={`${item.orcamentoId}-${item.etapa}`} item={item} />
          ))}
        </ul>
      )}
    </div>
  );
}
