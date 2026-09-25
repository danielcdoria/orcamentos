"use client";

// Abre a janela de impressão do navegador. Nela a pessoa escolhe "Salvar como PDF"
// (no iPhone: Compartilhar > Salvar em Arquivos). O nome do arquivo sugerido é o título da página.
export function BotaoPdf() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="w-full rounded-xl border border-gray-300 bg-white px-4 py-4 font-medium text-gray-900 hover:bg-gray-50 print:hidden"
    >
      Baixar PDF
    </button>
  );
}
