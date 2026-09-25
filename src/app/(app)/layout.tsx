import { exigirSessao } from "@/lib/auth";
import { sair } from "./actions";
import { Menu } from "./menu";

// Os parênteses em "(app)" criam um GRUPO: a pasta não aparece no endereço
// (src/app/(app)/page.tsx continua sendo "/"). Serve para aplicar este layout,
// que exige login, a todas as páginas internas de uma vez.
//
// Atenção: este layout protege as PÁGINAS. As ações que gravam dados (Server Actions)
// precisam chamar exigirSessao() por conta própria, porque podem ser chamadas diretamente.

export default async function LayoutInterno({ children }: LayoutProps<"/">) {
  const { empresaNome } = await exigirSessao();

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="border-b border-gray-200">
        <div className="mx-auto flex max-w-3xl items-center gap-6 px-5 py-4">
          <span className="truncate text-lg font-semibold">{empresaNome}</span>
          {/* No computador o menu fica aqui no topo; no celular ele vai para o rodapé */}
          <Menu />
          <form action={sair} className="ml-auto">
            <button type="submit" className="px-2 py-1 text-sm text-gray-600 hover:text-gray-900">
              Sair
            </button>
          </form>
        </div>
      </header>
      {/* pb-28 no celular deixa espaço para o conteúdo não ficar escondido atrás do menu */}
      <main className="mx-auto w-full max-w-3xl flex-1 px-5 pt-8 pb-28 md:pt-10 md:pb-12">{children}</main>
    </div>
  );
}
