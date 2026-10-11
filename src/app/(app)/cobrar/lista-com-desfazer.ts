// A lógica comum das listas de "Cobrar hoje" (cobrar e retomar): guarda os cartões concluídos
// nesta visita. Quando o servidor atualiza a lista, eles já saíram dela, mas a linha verde
// (com o "Desfazer") continua na tela, no mesmo lugar. Ao desfazer, o cartão volta.
import { useState } from "react";

export type Concluido<T> = {
  item: T;
  posicao: number; // onde o cartão estava
  texto: string; // a linha verde, ex.: "Pousada X: cobrança registrada ✓"
  desfazer?: () => void; // só existe depois que o servidor confirmou (e se dá para desfazer)
  voltando?: boolean; // desfeito: mostra o cartão de novo enquanto a lista do servidor atualiza
};

export function useListaComDesfazer<T>(itens: T[], chave: (item: T) => string) {
  const [concluidos, setConcluidos] = useState<Record<string, Concluido<T>>>({});

  function concluir(item: T, posicao: number, texto: string) {
    setConcluidos((atual) => ({ ...atual, [chave(item)]: { item, posicao, texto } }));
  }

  function permitirDesfazer(item: T, desfazer: () => void) {
    setConcluidos((atual) => {
      const c = atual[chave(item)];
      return c && !c.voltando ? { ...atual, [chave(item)]: { ...c, desfazer } } : atual;
    });
  }

  function voltar(item: T) {
    setConcluidos((atual) => {
      const c = atual[chave(item)];
      return c ? { ...atual, [chave(item)]: { ...c, voltando: true, desfazer: undefined } } : atual;
    });
  }

  // A lista atual + os concluídos que já saíram dela, cada um na posição em que estava.
  const naLista = new Set(itens.map(chave));
  const linhas: { item: T; concluido?: Concluido<T> }[] = itens.map((item) => {
    const c = concluidos[chave(item)];
    return { item, concluido: c && !c.voltando ? c : undefined };
  });
  Object.values(concluidos)
    .filter((c) => !naLista.has(chave(c.item)))
    .sort((a, b) => a.posicao - b.posicao)
    .forEach((c) =>
      linhas.splice(Math.min(c.posicao, linhas.length), 0, { item: c.item, concluido: c.voltando ? undefined : c }),
    );

  return { linhas, concluir, permitirDesfazer, voltar };
}
