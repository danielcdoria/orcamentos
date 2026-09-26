"use client";

import { useRef, useState, useTransition } from "react";
import { removerLogo, salvarLogo } from "./actions";
import { estiloBotaoPerigo, estiloBotaoSecundario, estiloErro } from "@/components/estilos";

const LADO_MAX = 512; // pixels

// Diminui a imagem no próprio navegador antes de enviar: uma foto de 5 MB do celular
// vira um logo leve. Mantém a transparência (PNG).
async function reduzirImagem(arquivo: File): Promise<Blob> {
  const imagem = await createImageBitmap(arquivo);
  const escala = Math.min(1, LADO_MAX / Math.max(imagem.width, imagem.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(imagem.width * escala);
  canvas.height = Math.round(imagem.height * escala);
  canvas.getContext("2d")!.drawImage(imagem, 0, 0, canvas.width, canvas.height);

  // PNG: mantém fundo transparente e é aceito em todo lugar (inclusive no PDF).
  const blob = await new Promise<Blob | null>((ok) => canvas.toBlob(ok, "image/png"));
  if (!blob) throw new Error("Não foi possível processar a imagem.");
  return blob;
}

export function Logo({ logoUrl }: { logoUrl: string | null }) {
  const entrada = useRef<HTMLInputElement>(null);
  const [erro, setErro] = useState<string>();
  const [enviando, iniciar] = useTransition();

  function aoEscolher(e: React.ChangeEvent<HTMLInputElement>) {
    const arquivo = e.target.files?.[0];
    e.target.value = ""; // permite escolher o mesmo arquivo de novo
    if (!arquivo) return;
    setErro(undefined);

    iniciar(async () => {
      try {
        const reduzida = await reduzirImagem(arquivo);
        const dados = new FormData();
        dados.append("logo", reduzida, "logo");
        const resultado = await salvarLogo(dados);
        if (resultado.erro) setErro(resultado.erro);
      } catch {
        setErro("Não foi possível ler essa imagem. Tente um arquivo PNG ou JPG.");
      }
    });
  }

  return (
    <div className="flex items-center gap-4">
      <div className="flex size-24 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-gray-200 bg-white">
        {logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logoUrl} alt="Logo atual" className="h-full w-full object-contain" />
        ) : (
          <span className="text-sm text-gray-400">sem logo</span>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-2">
        <input
          ref={entrada}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          onChange={aoEscolher}
          className="hidden"
        />
        <button
          type="button"
          disabled={enviando}
          onClick={() => entrada.current?.click()}
          className={estiloBotaoSecundario}
        >
          {enviando ? "Enviando..." : logoUrl ? "Trocar logo" : "Escolher logo"}
        </button>
        {logoUrl && !enviando && (
          <button
            type="button"
            onClick={() => iniciar(() => removerLogo())}
            className={estiloBotaoPerigo}
          >
            Remover logo
          </button>
        )}
        {erro && <p role="alert" className={estiloErro}>{erro}</p>}
      </div>
    </div>
  );
}
