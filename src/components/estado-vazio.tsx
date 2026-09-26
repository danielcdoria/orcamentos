import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { estiloBotao, estiloCartao } from "@/components/estilos";

// Tela vazia: explica o que fazer e oferece o botão para fazer.
// Nunca deixar uma tela só dizendo "nada encontrado".
export function EstadoVazio({
  icone: Icone,
  titulo,
  texto,
  botao,
  href,
}: {
  icone: LucideIcon;
  titulo: string;
  texto: string;
  botao?: string;
  href?: string;
}) {
  return (
    <div className={`${estiloCartao} flex flex-col items-center gap-3 px-6 py-10 text-center`}>
      <Icone className="size-10 text-gray-400" aria-hidden strokeWidth={1.5} />
      <p className="text-lg font-semibold">{titulo}</p>
      <p className="max-w-sm text-base text-gray-600">{texto}</p>
      {botao && href && (
        <Link href={href} className={`${estiloBotao} mt-2 w-full max-w-xs`}>
          {botao}
        </Link>
      )}
    </div>
  );
}
