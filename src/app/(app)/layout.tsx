import type { Metadata } from "next";
import Link from "next/link";
import { Settings, Users } from "lucide-react";
import { exigirSessao } from "@/lib/auth";
import { contarFila } from "@/lib/cobranca";
import { prisma } from "@/lib/prisma";
import { Menu } from "./menu";

// Os parênteses em "(app)" criam um GRUPO: a pasta não aparece no endereço.
// Serve para aplicar este layout, que exige login, a todas as páginas internas de uma vez.
//
// Atenção: este layout protege as PÁGINAS. As ações que gravam dados (Server Actions)
// precisam chamar exigirSessao() por conta própria, porque podem ser chamadas diretamente.

// Na aba do navegador, o ícone vira o logo da empresa (se ela cadastrou um).
export async function generateMetadata(): Promise<Metadata> {
  const { empresaId } = await exigirSessao();
  const empresa = await prisma.empresa.findUnique({ where: { id: empresaId }, select: { logoUrl: true } });
  return empresa?.logoUrl ? { icons: { icon: empresa.logoUrl, apple: empresa.logoUrl } } : {};
}

const estiloAtalho =
  "flex min-h-11 min-w-11 flex-col items-center justify-center gap-0.5 rounded-lg px-2 text-[13px] text-gray-600 hover:bg-gray-100 hover:text-gray-900 md:flex-row md:gap-2 md:px-3 md:text-base";

export default async function LayoutInterno({ children }: LayoutProps<"/">) {
  const { empresaId, empresaNome } = await exigirSessao();
  const paraCobrar = await contarFila(empresaId); // número da bolinha vermelha

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center gap-4 px-4 py-2 md:gap-6 md:px-5 md:py-3">
          <span className="min-w-0 flex-1 truncate text-lg font-bold md:max-w-56 md:flex-none">
            {empresaNome}
          </span>
          {/* No computador o menu fica aqui no topo; no celular ele vai para o rodapé */}
          <Menu paraCobrar={paraCobrar} />
          <div className="flex shrink-0 items-center gap-1 md:ml-auto">
            <Link href="/clientes" className={estiloAtalho}>
              <Users className="size-5" aria-hidden />
              Clientes
            </Link>
            <Link href="/configuracoes" className={estiloAtalho}>
              <Settings className="size-5" aria-hidden />
              Ajustes
            </Link>
          </div>
        </div>
      </header>
      {/* pb-28 no celular deixa espaço para o conteúdo não ficar escondido atrás do menu */}
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 pt-6 pb-28 md:px-5 md:pt-10 md:pb-12">
        {children}
      </main>
    </div>
  );
}
