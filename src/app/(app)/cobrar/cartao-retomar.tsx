"use client";

// Seção "Retomar conversa" de "Cobrar hoje": quem respondeu e esfriou. Sem mensagem pronta e
// sem WhatsApp: a pessoa escreve à mão e toca em "Já retomei" (ou muda o status de vez).

import Link from "next/link";
import { useState, useTransition } from "react";
import { MessagesSquare } from "lucide-react";
import { formatarTelefone } from "@/lib/telefone";
import type { ItemRetomar } from "@/lib/retomar";
import { alterarStatus } from "@/app/(app)/orcamentos/actions";
import { estiloBotao, estiloBotaoSecundario, estiloCartao } from "@/components/estilos";
import { desfazerRetomada, registrarRetomada } from "./actions";
import { LinhaConcluida } from "./cartao-cobranca";
import { useListaComDesfazer } from "./lista-com-desfazer";

function textoDias(dias: number) {
  return dias === 1 ? "há 1 dia" : `há ${dias} dias`;
}

function CartaoRetomar({
  item,
  aoRetomar,
  aoMudarStatus,
}: {
  item: ItemRetomar;
  aoRetomar: () => void;
  aoMudarStatus: (status: "fechado" | "perdido") => void;
}) {
  const [mudando, setMudando] = useState(false); // mostra as opções de "Mudar status"

  return (
    <li className={`${estiloCartao} flex flex-col gap-4 p-4`}>
      <div className="min-w-0">
        <p className="text-xl font-bold break-words">{item.cliente}</p>
        {item.telefone && <p className="mt-1 text-base text-gray-700">{formatarTelefone(item.telefone)}</p>}
        <p className="mt-1 text-base text-gray-600">
          {item.jaRetomado ? "Você retomou" : "Respondeu"} {textoDias(item.dias)} ·{" "}
          <Link href={`/orcamentos/${item.orcamentoId}`} className="underline underline-offset-2">
            nº {item.numero}
          </Link>
        </p>
      </div>

      <button type="button" onClick={aoRetomar} className={`${estiloBotao} w-full text-lg`}>
        <MessagesSquare className="size-5" aria-hidden />
        Já retomei
      </button>

      {mudando ? (
        // Tira o orçamento desta lista de vez
        <div role="group" aria-label="Mudar status" className="grid grid-cols-3 gap-2">
          <button type="button" onClick={() => aoMudarStatus("fechado")} className={estiloBotaoSecundario}>
            Fechado
          </button>
          <button type="button" onClick={() => aoMudarStatus("perdido")} className={estiloBotaoSecundario}>
            Perdido
          </button>
          <button
            type="button"
            onClick={() => setMudando(false)}
            className="min-h-12 rounded-xl px-3 text-base text-gray-600 underline underline-offset-2 hover:bg-gray-50"
          >
            Cancelar
          </button>
        </div>
      ) : (
        <button type="button" onClick={() => setMudando(true)} className={`${estiloBotaoSecundario} w-full`}>
          Mudar status
        </button>
      )}
    </li>
  );
}

export function ListaRetomar({ itens }: { itens: ItemRetomar[] }) {
  const { linhas, concluir, permitirDesfazer, voltar } = useListaComDesfazer(itens, (i) => i.orcamentoId);
  const [, iniciar] = useTransition();

  function retomar(item: ItemRetomar, posicao: number) {
    concluir(item, posicao, `${item.cliente}: conversa retomada ✓`);
    iniciar(async () => {
      const r = await registrarRetomada(item.orcamentoId);
      if (r) {
        permitirDesfazer(item, () => {
          voltar(item);
          iniciar(() => desfazerRetomada(item.orcamentoId, r.anterior));
        });
      }
    });
  }

  function mudarStatus(item: ItemRetomar, posicao: number, status: "fechado" | "perdido") {
    concluir(item, posicao, `${item.cliente}: marcado como ${status === "fechado" ? "Fechado" : "Perdido"} ✓`);
    iniciar(() => alterarStatus(item.orcamentoId, status));
  }

  if (linhas.length === 0) return null;

  return (
    <section className="flex flex-col gap-3">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Retomar conversa</h2>
        <p className="mt-1 text-base text-gray-600">
          Responderam e pararam de falar. Retome a conversa e toque em “Já retomei”.
        </p>
      </div>
      <ul className="flex flex-col gap-4">
        {linhas.map(({ item, concluido }, posicao) =>
          concluido ? (
            <LinhaConcluida key={item.orcamentoId} texto={concluido.texto} aoDesfazer={concluido.desfazer} />
          ) : (
            <CartaoRetomar
              key={item.orcamentoId}
              item={item}
              aoRetomar={() => retomar(item, posicao)}
              aoMudarStatus={(status) => mudarStatus(item, posicao, status)}
            />
          ),
        )}
      </ul>
    </section>
  );
}
