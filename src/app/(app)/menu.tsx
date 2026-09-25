"use client";

// Menu fixo no rodapé, como em app de celular. Roda no navegador porque precisa
// saber em qual página a pessoa está (usePathname) para destacar o item certo.

import Link from "next/link";
import { usePathname } from "next/navigation";

const itens = [
  { href: "/orcamentos", rotulo: "Orçamentos" },
  { href: "/clientes", rotulo: "Clientes" },
  { href: "/catalogo", rotulo: "Catálogo" },
];

export function Menu() {
  const caminho = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 border-t border-gray-200 bg-white pb-[env(safe-area-inset-bottom)]">
      <ul className="mx-auto flex max-w-2xl">
        {itens.map((item) => {
          const ativo = caminho.startsWith(item.href);
          return (
            <li key={item.href} className="flex-1">
              <Link
                href={item.href}
                className={`block py-4 text-center text-sm ${
                  ativo ? "font-semibold text-gray-900" : "text-gray-500"
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
