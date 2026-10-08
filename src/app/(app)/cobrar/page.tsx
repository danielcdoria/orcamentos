import { CircleCheck } from "lucide-react";
import { exigirSessao } from "@/lib/auth";
import { buscarFila } from "@/lib/cobranca";
import { estiloTitulo } from "@/components/estilos";
import { EstadoVazio } from "@/components/estado-vazio";
import { ListaCobranca } from "./lista-cobranca";

// COBRAR HOJE: a tela principal do produto.
// Mostra quem precisa ser cobrado hoje. A pessoa escreve a mensagem no WhatsApp (cada
// conversa é diferente) e toca em "Já cobrei". O sistema NUNCA envia nada sozinho.
export default async function CobrarHoje() {
  const { empresaId } = await exigirSessao();
  const fila = await buscarFila(empresaId);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className={estiloTitulo}>Cobrar hoje</h1>
        {fila.length > 0 && (
          <p className="mt-1 text-base text-gray-600">
            {fila.length === 1
              ? "1 cliente esperando uma mensagem sua. Depois de mandar, toque em “Já cobrei”."
              : `${fila.length} clientes esperando uma mensagem sua. Depois de mandar, toque em “Já cobrei”.`}
          </p>
        )}
      </div>

      {fila.length === 0 ? (
        <EstadoVazio
          icone={CircleCheck}
          titulo="Tudo em dia"
          texto="Ninguém para cobrar hoje. Quando um cliente ficar sem responder um orçamento, ele aparece aqui no dia certo."
          botao="Ver orçamentos"
          href="/orcamentos"
        />
      ) : (
        <ListaCobranca fila={fila} />
      )}
    </div>
  );
}
