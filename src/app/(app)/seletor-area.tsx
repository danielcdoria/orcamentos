"use client";

// Botão do topo para trocar entre as áreas (Pousadas / Marcenarias).
// Só aparece para empresas com áreas ligadas (src/lib/area.ts).

import { useTransition } from "react";
import { trocarArea } from "./actions";

export function SeletorArea({ atual, areas }: { atual: string; areas: { valor: string; rotulo: string }[] }) {
  const [trocando, iniciar] = useTransition();

  return (
    <div
      role="group"
      aria-label="Área"
      className={`flex shrink-0 rounded-lg bg-gray-100 p-1 ${trocando ? "opacity-60" : ""}`}
    >
      {areas.map(({ valor, rotulo }) => {
        const ativo = valor === atual;
        return (
          <button
            key={valor}
            type="button"
            aria-pressed={ativo}
            disabled={trocando}
            onClick={() => !ativo && iniciar(() => trocarArea(valor))}
            className={`min-h-9 rounded-md px-3 text-sm font-medium md:text-[15px] ${
              ativo ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-900"
            }`}
          >
            {rotulo}
          </button>
        );
      })}
    </div>
  );
}
