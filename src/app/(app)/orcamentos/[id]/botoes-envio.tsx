"use client";

import { useState } from "react";
import { Check, Copy, MessageCircle } from "lucide-react";
import { marcarEnviado } from "../actions";
import { estiloBotao, estiloBotaoSecundario } from "@/components/estilos";

// Copia um texto. O jeito moderno (navigator.clipboard) só funciona em https ou localhost;
// pelo IP da rede (http://192.168...) ele não existe, então usamos o jeito antigo como reserva.
async function copiar(texto: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(texto);
    return true;
  } catch {
    const area = document.createElement("textarea");
    area.value = texto;
    area.style.position = "fixed";
    area.style.opacity = "0";
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand("copy");
    area.remove();
    return ok;
  }
}

export function BotoesEnvio({
  orcamentoId,
  link,
  urlWhatsApp,
  temTelefone,
  jaEnviado,
}: {
  orcamentoId: string;
  link: string;
  urlWhatsApp: string;
  temTelefone: boolean;
  jaEnviado: boolean;
}) {
  const [copiado, setCopiado] = useState(false);

  async function aoCopiar() {
    if (await copiar(link)) {
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2500);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Link normal (e não window.open): assim o celular abre o app do WhatsApp sem ser
          bloqueado. O onClick só avisa o servidor que foi enviado. */}
      <a
        href={urlWhatsApp}
        target="_blank"
        rel="noopener"
        onClick={() => void marcarEnviado(orcamentoId)}
        className={`${estiloBotao} w-full text-lg`}
      >
        <MessageCircle className="size-5" aria-hidden />
        {jaEnviado ? "Enviar de novo no WhatsApp" : "Enviar no WhatsApp"}
      </a>
      {!temTelefone && (
        <p className="text-base text-gray-600">
          Este cliente está sem telefone completo (com DDD). O WhatsApp vai pedir para você escolher
          o contato.
        </p>
      )}

      <button type="button" onClick={aoCopiar} className={`${estiloBotaoSecundario} w-full`}>
        {copiado ? <Check className="size-5 text-green-700" aria-hidden /> : <Copy className="size-5" aria-hidden />}
        {copiado ? "Link copiado" : "Copiar link do orçamento"}
      </button>
    </div>
  );
}
