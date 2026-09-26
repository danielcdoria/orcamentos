// Botão "Baixar PDF": um link comum para /orcamento/<token>/pdf, que devolve o arquivo
// pronto para download (o servidor monta o PDF). Nada de janela de impressão.
export function BotaoPdf({ token }: { token: string }) {
  return (
    <a
      href={`/orcamento/${token}/pdf`}
      download
      className="flex min-h-12 w-full items-center justify-center rounded-xl border border-gray-300 bg-white px-4 py-3 text-base font-medium text-gray-900 hover:bg-gray-50 print:hidden"
    >
      Baixar PDF
    </a>
  );
}
