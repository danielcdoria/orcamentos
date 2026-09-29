// Peças visuais da página pública usadas em dois modos: orçamento comum (montado no servidor)
// e orçamento com opções (o total muda no navegador; ver escolha.tsx).
import type { MouseEventHandler } from "react";
import { MessageCircle } from "lucide-react";
import { formatarCentavos } from "@/lib/dinheiro";

export function CaixaTotal({ valor, aoVivo = false }: { valor: number; aoVivo?: boolean }) {
  return (
    <section className="mx-5 mt-5 flex flex-wrap items-center justify-between gap-x-8 gap-y-1 rounded-xl bg-marca px-6 py-5 text-white break-inside-avoid sm:mx-8 sm:ml-auto sm:w-fit sm:min-w-80">
      <span className="text-lg font-medium">Total</span>
      {/* aoVivo: leitores de tela anunciam o valor novo quando o cliente troca uma opção */}
      <span className="text-3xl font-extrabold tabular-nums" aria-live={aoVivo ? "polite" : undefined}>
        {formatarCentavos(valor)}
      </span>
    </section>
  );
}

// Botão para o cliente responder a empresa no WhatsApp (link wa.me com o texto pronto)
export function LinkResponder({
  whatsEmpresa,
  texto,
  onClick,
}: {
  whatsEmpresa: string;
  texto: string;
  onClick?: MouseEventHandler<HTMLAnchorElement>;
}) {
  return (
    <a
      href={`https://wa.me/${whatsEmpresa}?text=${encodeURIComponent(texto)}`}
      onClick={onClick}
      className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-marca px-4 py-3 text-lg font-semibold text-white"
    >
      <MessageCircle className="size-5" aria-hidden />
      Responder no WhatsApp
    </a>
  );
}
