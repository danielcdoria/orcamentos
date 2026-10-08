"use client";

// Barra de busca da lista de orçamentos. Não filtra aqui: atualiza o endereço
// (?busca=...) um instante depois de a pessoa parar de digitar, e o servidor busca.

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import type { StatusOrcamento } from "@/generated/prisma/enums";
import { estiloCampo } from "@/components/estilos";

export function BuscaOrcamentos({ buscaInicial, status }: { buscaInicial: string; status?: StatusOrcamento }) {
  const router = useRouter();
  const [busca, setBusca] = useState(buscaInicial);
  const [procurando, iniciar] = useTransition();
  const espera = useRef<ReturnType<typeof setTimeout>>(undefined);

  function procurar(texto: string) {
    clearTimeout(espera.current);
    const p = new URLSearchParams();
    if (texto.trim()) p.set("busca", texto.trim());
    if (status) p.set("status", status); // mantém a pílula escolhida; o "Mostrar mais" volta ao início
    const qs = p.toString();
    iniciar(() => router.replace(qs ? `/orcamentos?${qs}` : "/orcamentos", { scroll: false }));
  }

  function mudar(texto: string) {
    setBusca(texto);
    clearTimeout(espera.current);
    espera.current = setTimeout(() => procurar(texto), 300);
  }

  return (
    <form
      role="search"
      onSubmit={(e) => {
        e.preventDefault();
        procurar(busca);
      }}
      className="relative"
    >
      <Search className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-gray-400" aria-hidden />
      <input
        type="search"
        value={busca}
        onChange={(e) => mudar(e.target.value)}
        placeholder="Procurar por cliente ou nº"
        aria-label="Procurar orçamento por cliente ou número"
        className={`${estiloCampo} pl-12 ${procurando ? "pr-28" : ""}`}
      />
      {procurando && (
        <span className="pointer-events-none absolute top-1/2 right-4 -translate-y-1/2 text-sm text-gray-500">
          Procurando...
        </span>
      )}
    </form>
  );
}
