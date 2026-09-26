"use client";

// Menu principal com 4 itens grandes. No celular fica fixo embaixo (onde o dedo alcança);
// no computador (md: = 768px ou mais) vira abas no topo.
// "Cobrar hoje" mostra uma bolinha vermelha com o número de clientes esperando cobrança:
// é o que faz a pessoa voltar todo dia.

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, BellRing, FileText, Package } from "lucide-react";

const itens = [
  { href: "/orcamentos", rotulo: "Orçamentos", icone: FileText },
  { href: "/cobrar", rotulo: "Cobrar hoje", icone: BellRing },
  { href: "/catalogo", rotulo: "Catálogo", icone: Package },
  { href: "/painel", rotulo: "Painel", icone: BarChart3 },
];

export function Menu({ paraCobrar }: { paraCobrar: number }) {
  const caminho = usePathname();

  return (
    <nav
      aria-label="Menu principal"
      className="fixed inset-x-0 bottom-0 z-20 border-t border-gray-200 bg-white pb-[env(safe-area-inset-bottom)] md:static md:border-0 md:bg-transparent md:pb-0"
    >
      <ul className="mx-auto flex max-w-3xl md:gap-1">
        {itens.map(({ href, rotulo, icone: Icone }) => {
          const ativo = caminho.startsWith(href);
          const bolinha = href === "/cobrar" && paraCobrar > 0;
          return (
            <li key={href} className="flex-1 md:flex-none">
              <Link
                href={href}
                aria-current={ativo ? "page" : undefined}
                className={`flex min-h-16 flex-col items-center justify-center gap-1 px-1 text-[13px] md:min-h-11 md:flex-row md:gap-2 md:rounded-lg md:px-4 md:text-base ${
                  ativo ? "font-semibold text-gray-900 md:bg-gray-100" : "text-gray-500 hover:text-gray-900"
                }`}
              >
                <span className="relative">
                  <Icone className="size-6 md:size-5" aria-hidden strokeWidth={ativo ? 2.25 : 1.75} />
                  {bolinha && (
                    <span
                      className="absolute -top-2 -right-3 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-xs font-bold text-white ring-2 ring-white"
                      aria-label={`${paraCobrar} esperando cobrança`}
                    >
                      {paraCobrar}
                    </span>
                  )}
                </span>
                {rotulo}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
