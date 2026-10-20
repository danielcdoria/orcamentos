import Link from "next/link";

// As duas formas de ver as negociações: "Hoje" (por data) e "Funil" (por etapa).
export function AbasNegociacao({ ativa }: { ativa: "hoje" | "funil" }) {
  const abas = [
    { id: "hoje", href: "/hoje", rotulo: "Por data" },
    { id: "funil", href: "/funil", rotulo: "Por etapa (funil)" },
  ] as const;
  return (
    <nav aria-label="Ver negociações" className="flex gap-2">
      {abas.map((a) => (
        <Link
          key={a.id}
          href={a.href}
          aria-current={a.id === ativa ? "page" : undefined}
          className={`flex min-h-11 items-center rounded-full px-4 text-[15px] font-medium ${
            a.id === ativa ? "bg-gray-900 text-white" : "bg-white text-gray-800 ring-1 ring-gray-300 hover:bg-gray-50"
          }`}
        >
          {a.rotulo}
        </Link>
      ))}
    </nav>
  );
}
