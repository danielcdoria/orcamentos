"use client";

// Aviso verde de "deu certo" (ex.: "Cliente salvo."), mostrado depois de salvar.
// As telas recebem um código no endereço (?ok=cliente-salvo); este componente mostra a
// mensagem, some sozinho em alguns segundos e limpa o endereço.

import { useEffect, useState } from "react";
import { CircleCheck } from "lucide-react";

const MENSAGENS: Record<string, string> = {
  "cliente-salvo": "Cliente salvo.",
  "item-salvo": "Item salvo no catálogo.",
  "item-apagado": "Item apagado do catálogo.",
  "orcamento-criado": "Orçamento criado. Agora é só enviar para o cliente.",
  "orcamento-enviado": "Orçamento salvo e marcado como enviado. A cobrança conta os dias a partir de hoje.",
};

export function Aviso({ codigo }: { codigo?: string | string[] }) {
  // Guarda a mensagem na primeira vez: mesmo que o endereço mude, o aviso continua na tela.
  const [mensagem] = useState(() => (typeof codigo === "string" ? MENSAGENS[codigo] : undefined));
  const [visivel, setVisivel] = useState(Boolean(mensagem));

  useEffect(() => {
    if (!mensagem) return;
    // Tira o ?ok= do endereço sem recarregar a tela (para o aviso não voltar ao atualizar).
    const url = new URL(window.location.href);
    url.searchParams.delete("ok");
    window.history.replaceState(window.history.state, "", url.pathname + url.search);
    const t = setTimeout(() => setVisivel(false), 6000);
    return () => clearTimeout(t);
  }, [mensagem]);

  if (!mensagem || !visivel) return null;
  return (
    <p role="status" className="flex items-center gap-2 rounded-xl bg-green-50 px-4 py-3 text-base text-green-800">
      <CircleCheck className="size-5 shrink-0" aria-hidden />
      {mensagem}
    </p>
  );
}
