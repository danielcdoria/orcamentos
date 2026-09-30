"use client";

// Bloco discreto de Pix na página do orçamento: a chave, o recebedor e "Copiar chave Pix".
// É SÓ EXIBIÇÃO: o sistema não gera QR code, não recebe e não confere pagamento.

import { useState } from "react";
import { Check, Copy } from "lucide-react";

async function copiar(texto: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(texto);
      return true;
    }
  } catch {
    // cai no jeito antigo, abaixo
  }
  // Jeito antigo (navegadores velhos e endereços sem https, como o teste no celular pela rede de casa)
  const campo = document.createElement("textarea");
  campo.value = texto;
  campo.setAttribute("readonly", "");
  campo.style.position = "fixed";
  campo.style.opacity = "0";
  document.body.appendChild(campo);
  campo.select();
  campo.setSelectionRange(0, texto.length);
  const ok = document.execCommand("copy");
  campo.remove();
  return ok;
}

export function BlocoPix({ chave, recebedor }: { chave: string; recebedor: string | null }) {
  const [situacao, setSituacao] = useState<"parado" | "copiado" | "falhou">("parado");

  async function aoCopiar() {
    setSituacao((await copiar(chave)) ? "copiado" : "falhou");
  }

  return (
    <section
      aria-label="Pagamento por Pix"
      className="mx-5 mt-4 flex flex-col gap-3 rounded-xl border border-gray-200 px-4 py-4 break-inside-avoid sm:mx-8 sm:ml-auto sm:w-fit sm:max-w-md sm:min-w-80"
    >
      <div>
        <p className="text-sm text-gray-500">Pagamento por Pix</p>
        {/* select-all: um toque seleciona a chave inteira, caso o botão não consiga copiar */}
        <p className="mt-1 text-base font-semibold break-all select-all">{chave}</p>
        {recebedor && <p className="text-base text-gray-700">Recebedor: {recebedor}</p>}
      </div>
      <button
        type="button"
        onClick={aoCopiar}
        className="flex min-h-12 items-center justify-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-3 text-base font-medium text-gray-900 hover:bg-gray-50 print:hidden"
      >
        {situacao === "copiado" ? <Check className="size-5 text-green-700" aria-hidden /> : <Copy className="size-5" aria-hidden />}
        {situacao === "copiado" ? "Chave copiada" : "Copiar chave Pix"}
      </button>
      <p role="status" className="text-sm text-gray-600">
        {situacao === "falhou"
          ? "Não deu para copiar. Toque e segure a chave acima para copiar."
          : situacao === "copiado"
            ? "Agora é só colar no app do seu banco, na área Pix."
            : recebedor
              ? `Ao pagar, confira se o banco mostra o nome ${recebedor}.`
              : null}
      </p>
    </section>
  );
}
