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
      <header className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
        <span className="truncate font-semibold">{empresaNome}</span>
        <form action={sair}>
          <button type="submit" className="px-2 py-1 text-sm text-gray-600">
            Sair
          </button>
        </form>
      </header>
      {/* pb-24 deixa espaço para o conteúdo não ficar escondido atrás do menu */}
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 pt-6 pb-24">{children}</main>
      <Menu />
    </div>
  );
}
