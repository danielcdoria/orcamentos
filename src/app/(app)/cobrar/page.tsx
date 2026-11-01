import Link from "next/link";
import { exigirSessao } from "@/lib/auth";
import { buscarFila } from "@/lib/cobranca";
import { buscarRetomar } from "@/lib/retomar";
import { estiloTitulo } from "@/components/estilos";
import { TelaCobrar } from "./tela-cobrar";

// COBRAR HOJE: a tela principal do produto.
// Mostra quem precisa ser cobrado hoje. A pessoa escreve a mensagem no WhatsApp (cada
// conversa é diferente) e toca em "Já cobrei". Embaixo, "Retomar conversa": quem respondeu
// e esfriou (src/lib/retomar.ts). O sistema NUNCA envia nada sozinho.
export default async function CobrarHoje() {
  const { empresaId } = await exigirSessao();
  const [fila, retomar] = await Promise.all([buscarFila(empresaId), buscarRetomar(empresaId)]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <div className="flex items-center justify-between gap-3">
          <h1 className={estiloTitulo}>Cobrar hoje</h1>
          <Link href="/importar" className="text-base font-semibold text-marca underline-offset-2 hover:underline">
          Importar lote
        </Link>
        </div>
        {fila.length > 0 && (
          <p className="mt-1 text-base text-gray-600">
            {fila.length === 1
              ? "1 cliente esperando uma mensagem sua. Depois de mandar, toque em “Já cobrei”."
              : `${fila.length} clientes esperando uma mensagem sua. Depois de mandar, toque em “Já cobrei”.`}
          </p>
        )}
      </div>

      <TelaCobrar fila={fila} retomar={retomar} />
    </div>
  );
}
