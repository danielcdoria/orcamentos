"use client";

// Troca o status de um orçamento na hora, sem abrir o orçamento.
// É um <select> nativo: no celular abre a roleta do próprio sistema, fácil de tocar.

import { useOptimistic, useTransition } from "react";
import type { StatusOrcamento } from "@/generated/prisma/enums";
import { alterarStatus } from "@/app/(app)/orcamentos/actions";
import { LISTA_STATUS, STATUS } from "@/lib/status";

export function SeletorStatus({ id, status }: { id: string; status: StatusOrcamento }) {
  const [, iniciar] = useTransition();
  // Mostra o novo status imediatamente, antes de o servidor responder.
  const [atual, mostrar] = useOptimistic(status);

  return (
    <select
      aria-label="Status do orçamento"
      value={atual}
      onChange={(e) => {
        const novo = e.target.value as StatusOrcamento;
        iniciar(async () => {
          mostrar(novo);
          await alterarStatus(id, novo);
        });
      }}
      className={`cursor-pointer appearance-none rounded-full border-0 py-1 pr-7 pl-3 text-xs font-semibold ${STATUS[atual].estilo}`}
      style={{
        // setinha ▾ desenhada no fundo, já que "appearance-none" remove a do sistema
        backgroundImage:
          "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='currentColor' opacity='.6'/%3E%3C/svg%3E\")",
        backgroundRepeat: "no-repeat",
        backgroundPosition: "right 0.6rem center",
      }}
    >
      {LISTA_STATUS.map((s) => (
        <option key={s} value={s}>
          {STATUS[s].rotulo}
        </option>
      ))}
    </select>
  );
}
