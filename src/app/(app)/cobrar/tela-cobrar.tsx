"use client";

// O conteúdo de "Cobrar hoje": as cobranças e, embaixo, "Retomar conversa".
// Fica no navegador para a tela não trocar tudo por "Tudo em dia" quando a última pousada é
// concluída: a linha verde (com o "Desfazer") precisa continuar na tela.

import { useState } from "react";
import { CircleCheck } from "lucide-react";
import type { ItemFila } from "@/lib/cobranca";
import type { ItemRetomar } from "@/lib/retomar";
import { EstadoVazio } from "@/components/estado-vazio";
import { ListaCobranca } from "./lista-cobranca";
import { ListaRetomar } from "./cartao-retomar";

export function TelaCobrar({ fila, retomar }: { fila: ItemFila[]; retomar: ItemRetomar[] }) {
  // "Tudo em dia" só quando a tela já abriu vazia (não no meio do trabalho)
  const [abriuVazia] = useState(fila.length === 0 && retomar.length === 0);
  if (abriuVazia && fila.length === 0 && retomar.length === 0) {
    return (
      <EstadoVazio
        icone={CircleCheck}
        titulo="Tudo em dia"
        texto="Ninguém para cobrar nem retomar hoje. Quando um cliente ficar sem responder um orçamento, ou responder e sumir, ele aparece aqui no dia certo."
        botao="Ver orçamentos"
        href="/orcamentos"
      />
    );
  }

  return (
    <>
      <ListaCobranca fila={fila} />
      <ListaRetomar itens={retomar} />
    </>
  );
}
