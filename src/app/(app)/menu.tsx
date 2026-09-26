"use client";

// Menu principal. No celular fica fixo no rodapé (onde o dedo alcança);
// a partir de telas médias (md: = 768px ou mais) vira abas no topo.
// Roda no navegador porque precisa saber em qual página a pessoa está (usePathname).

import Link from "next/link";
import { usePathname } from "next/navigation";

const itens = [
  { href: "/cobrar", rotulo: "Cobrar" },
  { href: "/orcamentos", rotulo: "Orçamentos" },
  { href: "/clientes", rotulo: "Clientes" },
  { href: "/catalogo", rotulo: "Catálogo" },
];

export function Menu() {
  const caminho = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-10 border-t border-gray-200 bg-white pb-[env(safe-area-inset-bottom)] md:static md:border-0 md:bg-transparent md:pb-0">
      <ul className="mx-auto flex max-w-3xl md:gap-1">
        {itens.map((item) => {
          const ativo = caminho.startsWith(item.href);
          return (
            <li key={item.href} className="flex-1 md:flex-none">
              <Link
                href={item.href}
                className={`block py-4 text-center text-sm md:rounded-lg md:px-4 md:py-2 ${
                  ativo
                    ? "font-semibold text-gray-900 md:bg-gray-100"
                    : "text-gray-500 hover:text-gray-900"
                }`}
              >
                {item.rotulo}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
