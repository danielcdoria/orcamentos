"use client";

import { useRef, useState, useTransition } from "react";
import { removerLogo, salvarLogo } from "./actions";
import { estiloBotaoPerigo, estiloBotaoSecundario, estiloErro } from "@/components/estilos";

const LADO_MAX = 512; // pixels

// Diminui a imagem no próprio navegador antes de enviar: uma foto de 5 MB do celular
// vira um logo leve. Mantém a transparência (PNG/WebP).
async function reduzirImagem(arquivo: File): Promise<Blob> {
  const imagem = await createImageBitmap(arquivo);
  const escala = Math.min(1, LADO_MAX / Math.max(imagem.width, imagem.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(imagem.width * escala);
  canvas.height = Math.round(imagem.height * escala);
  canvas.getContext("2d")!.drawImage(imagem, 0, 0, canvas.width, canvas.height);

  const gerar = (tipo: string) =>
    new Promise<Blob | null>((ok) => canvas.toBlob(ok, tipo, 0.9));
  // WebP é menor; se o navegador não souber gerar WebP, ele devolve PNG.
  const blob = (await gerar("image/webp")) ?? (await gerar("image/png"));
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
      <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-gray-200 bg-white">
        {logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logoUrl} alt="Logo atual" className="h-full w-full object-contain" />
        ) : (
          <span className="text-xs text-gray-400">sem logo</span>
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
            className={`${estiloBotaoPerigo} py-2 text-sm`}
          >
            Remover logo
          </button>
        )}
        {erro && <p role="alert" className={estiloErro}>{erro}</p>}
      </div>
    </div>
  );
}
