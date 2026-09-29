// Botão "Baixar PDF": um link comum para /orcamento/<token>/pdf, que devolve o arquivo
// pronto para download (o servidor monta o PDF). Nada de janela de impressão.
import type { MouseEventHandler } from "react";
import { Download } from "lucide-react";

export function BotaoPdf({ token, onClick }: { token: string; onClick?: MouseEventHandler<HTMLAnchorElement> }) {
  return (
    <a
      href={`/orcamento/${token}/pdf`}
      download
      onClick={onClick}
      className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-3 text-base font-medium text-gray-900 hover:bg-gray-50 print:hidden"
    >
      <Download className="size-5" aria-hidden />
      Baixar PDF
    </a>
  );
}
