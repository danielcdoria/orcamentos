"use client";

// A lista de "Cobrar hoje". Guarda os cartões concluídos nesta visita: quando o servidor
// atualiza a fila, eles já saíram dela, mas a linha verde (com o "Desfazer") continua na tela,
// no mesmo lugar. Ao desfazer, o cartão volta.

import { useState, useTransition } from "react";
import type { ItemFila } from "@/lib/cobranca";
import { desfazerCobranca, marcarRespondido, registrarCobranca } from "./actions";
import { CartaoCobranca, LinhaConcluida } from "./cartao-cobranca";

type Concluido = {
  item: ItemFila;
  posicao: number; // onde o cartão estava, para a linha verde ficar no mesmo lugar
  tipo: "cobrado" | "respondido" | "voltando"; // voltando = desfeito, esperando a fila atualizar
  cobrancaId?: string | null;
};

const chave = (i: ItemFila) => `${i.orcamentoId}-${i.etapa}`;

export function ListaCobranca({ fila }: { fila: ItemFila[] }) {
  const [concluidos, setConcluidos] = useState<Record<string, Concluido>>({});
  const [, iniciar] = useTransition();

  function marcar(k: string, mudanca: Partial<Concluido> & Pick<Concluido, "item" | "posicao" | "tipo">) {
    setConcluidos((atual) => ({ ...atual, [k]: { ...atual[k], ...mudanca } }));
  }

  function cobrar(item: ItemFila, posicao: number) {
    const k = chave(item);
    marcar(k, { item, posicao, tipo: "cobrado", cobrancaId: undefined });
    iniciar(async () => {
      const id = await registrarCobranca(item.orcamentoId, item.etapa);
      setConcluidos((atual) => (atual[k] ? { ...atual, [k]: { ...atual[k], cobrancaId: id } } : atual));
    });
  }

  function responder(item: ItemFila, posicao: number) {
    marcar(chave(item), { item, posicao, tipo: "respondido" });
    iniciar(() => marcarRespondido(item.orcamentoId));
  }

  function desfazer(c: Concluido) {
    if (!c.cobrancaId) return;
    const id = c.cobrancaId;
    marcar(chave(c.item), { ...c, tipo: "voltando", cobrancaId: undefined });
    iniciar(() => desfazerCobranca(id));
  }

  // Monta a tela: a fila atual + os concluídos que já saíram dela, cada um na posição em que estava.
  const naFila = new Set(fila.map(chave));
  const linhas: { item: ItemFila; concluido?: Concluido }[] = fila.map((item) => {
    const c = concluidos[chave(item)];
    return { item, concluido: c && c.tipo !== "voltando" ? c : undefined };
  });
  Object.values(concluidos)
    .filter((c) => !naFila.has(chave(c.item)))
    .sort((a, b) => a.posicao - b.posicao)
    .forEach((c) => linhas.splice(Math.min(c.posicao, linhas.length), 0, { item: c.item, concluido: c }));

  return (
    <ul className="flex flex-col gap-4">
      {linhas.map(({ item, concluido }, posicao) =>
        concluido && concluido.tipo !== "voltando" ? (
          <LinhaConcluida
            key={chave(item)}
            item={item}
            tipo={concluido.tipo}
            aoDesfazer={concluido.cobrancaId ? () => desfazer(concluido) : undefined}
          />
        ) : (
          <CartaoCobranca
            key={chave(item)}
            item={item}
            aoCobrar={() => cobrar(item, posicao)}
            aoResponder={() => responder(item, posicao)}
          />
        ),
      )}
    </ul>
  );
}
