"use client";

// A lista de cobranças de "Cobrar hoje". A linha verde com "Desfazer" fica no lugar do cartão
// mesmo depois que o servidor tira o orçamento da fila (ver lista-com-desfazer.ts).

import { useTransition } from "react";
import type { ItemFila } from "@/lib/cobranca";
import { desfazerCobranca, marcarRespondido, registrarCobranca } from "./actions";
import { CartaoCobranca, LinhaConcluida } from "./cartao-cobranca";
import { useListaComDesfazer } from "./lista-com-desfazer";

export function ListaCobranca({ fila }: { fila: ItemFila[] }) {
  const { linhas, concluir, permitirDesfazer, voltar } = useListaComDesfazer(fila, (i) => i.orcamentoId);
  const [, iniciar] = useTransition();

  function cobrar(item: ItemFila, posicao: number) {
    concluir(item, posicao, `${item.cliente}: cobrança registrada ✓`);
    iniciar(async () => {
      const id = await registrarCobranca(item.orcamentoId);
      if (id) {
        permitirDesfazer(item, () => {
          voltar(item);
          iniciar(() => desfazerCobranca(id));
        });
      }
    });
  }

  function responder(item: ItemFila, posicao: number) {
    concluir(item, posicao, `${item.cliente}: marcado como respondido ✓`);
    iniciar(() => marcarRespondido(item.orcamentoId));
  }

  if (linhas.length === 0) {
    return <p className="rounded-2xl bg-green-50 px-5 py-4 text-base text-green-800">Nenhuma cobrança para hoje ✓</p>;
  }

  return (
    <ul className="flex flex-col gap-4">
      {linhas.map(({ item, concluido }, posicao) =>
        concluido ? (
          <LinhaConcluida key={item.orcamentoId} texto={concluido.texto} aoDesfazer={concluido.desfazer} />
        ) : (
          <CartaoCobranca
            key={item.orcamentoId}
            item={item}
            aoCobrar={() => cobrar(item, posicao)}
            aoResponder={() => responder(item, posicao)}
          />
        ),
      )}
    </ul>
  );
}
