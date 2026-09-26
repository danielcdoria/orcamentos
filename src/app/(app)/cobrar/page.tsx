import { CircleCheck } from "lucide-react";
import { exigirSessao } from "@/lib/auth";
import { buscarFila } from "@/lib/cobranca";
import { urlBase } from "@/lib/url";
import { estiloTitulo } from "@/components/estilos";
import { EstadoVazio } from "@/components/estado-vazio";
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
        <h1 className={estiloTitulo}>Cobrar hoje</h1>
        {fila.length > 0 && (
          <p className="mt-1 text-base text-gray-600">
            {fila.length === 1
              ? "1 cliente esperando uma mensagem sua. A mensagem já está pronta."
              : `${fila.length} clientes esperando uma mensagem sua. As mensagens já estão prontas.`}
          </p>
        )}
      </div>

      {fila.length === 0 ? (
        <EstadoVazio
          icone={CircleCheck}
          titulo="Tudo em dia"
          texto="Ninguém para cobrar hoje. Quando um cliente ficar sem responder um orçamento, ele aparece aqui no dia certo, com a mensagem pronta."
          botao="Ver orçamentos"
          href="/orcamentos"
        />
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
