"use client";

// Lista de clientes com busca instantânea (no navegador, a cada tecla).
// A lista inteira já vem do servidor, só da empresa logada; aqui só se filtra.

import Link from "next/link";
import { useState } from "react";
import { ChevronRight, Search } from "lucide-react";
import { clienteBate } from "@/lib/busca";
import { formatarTelefone } from "@/lib/telefone";
import { estiloBotao, estiloBotaoSecundario, estiloCampo, estiloCartao } from "@/components/estilos";

type Cliente = { id: string; nome: string; telefone: string | null; observacao: string | null };

export function ListaClientes({ clientes }: { clientes: Cliente[] }) {
  const [busca, setBusca] = useState("");
  const digitado = busca.trim();
  const visiveis = digitado ? clientes.filter((c) => clienteBate(c, digitado)) : clientes;

  return (
    <>
      <div className="flex flex-col gap-2">
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-gray-400" aria-hidden />
          <input
            type="search"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Procurar por nome ou telefone"
            aria-label="Procurar cliente por nome ou telefone"
            className={`${estiloCampo} pl-12`}
          />
        </div>
        <p className="text-sm text-gray-600" aria-live="polite">
          {digitado
            ? `${visiveis.length} de ${clientes.length}`
            : clientes.length === 1
              ? "1 cliente"
              : `${clientes.length} clientes`}
        </p>
      </div>

      {visiveis.length === 0 ? (
        <div className={`${estiloCartao} flex flex-col items-center gap-3 px-6 py-8 text-center`}>
          <p className="text-base text-gray-700">Nenhum cliente com “{digitado}”.</p>
          <div className="flex w-full max-w-xs flex-col gap-3">
            <Link href={`/clientes/novo?nome=${encodeURIComponent(digitado)}`} className={estiloBotao}>
              Cadastrar “{digitado.length > 30 ? `${digitado.slice(0, 30)}…` : digitado}”
            </Link>
            <button type="button" onClick={() => setBusca("")} className={estiloBotaoSecundario}>
              Ver todos
            </button>
          </div>
        </div>
      ) : (
        <ul className={`${estiloCartao} divide-y divide-gray-200`}>
          {visiveis.map((c) => (
            <li key={c.id}>
              <Link href={`/clientes/${c.id}`} className="flex min-h-16 items-center gap-3 px-4 py-3 hover:bg-gray-50">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-lg font-semibold">{c.nome}</p>
                  {c.telefone && <p className="text-base text-gray-600">{formatarTelefone(c.telefone)}</p>}
                  {c.observacao && <p className="truncate text-base text-gray-500">{c.observacao}</p>}
                </div>
                <ChevronRight className="size-5 shrink-0 text-gray-400" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
