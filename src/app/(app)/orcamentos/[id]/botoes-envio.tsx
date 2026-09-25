"use client";

import { useState } from "react";
import { marcarEnviado } from "../actions";
import { estiloBotaoSecundario, estiloBotaoWhatsApp } from "@/components/estilos";

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
}: {
  orcamentoId: string;
  link: string;
  urlWhatsApp: string;
  temTelefone: boolean;
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
        className={estiloBotaoWhatsApp}
      >
        Enviar no WhatsApp
      </a>
      {!temTelefone && (
        <p className="text-center text-xs text-gray-500">
          O cliente não tem telefone completo (com DDD) cadastrado: o WhatsApp vai pedir para
          você escolher o contato.
        </p>
      )}

      <button type="button" onClick={aoCopiar} className={estiloBotaoSecundario}>
        {copiado ? "Link copiado ✓" : "Copiar link"}
      </button>
    </div>
  );
}
