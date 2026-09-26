"use client";

// Troca o status de um orçamento na hora, sem abrir o orçamento.
// É um <select> nativo: no celular abre a roleta do próprio sistema, fácil de tocar.
// Mostra "Salvo ✓" quando o servidor confirma.

import { useOptimistic, useState, useTransition } from "react";
import { ChevronDown } from "lucide-react";
import type { StatusOrcamento } from "@/generated/prisma/enums";
import { alterarStatus } from "@/app/(app)/orcamentos/actions";
import { LISTA_STATUS, STATUS } from "@/lib/status";

export function SeletorStatus({ id, status }: { id: string; status: StatusOrcamento }) {
  const [salvando, iniciar] = useTransition();
  const [atual, mostrar] = useOptimistic(status); // mostra o novo status antes de o servidor responder
  const [salvo, setSalvo] = useState(false);

  return (
    <span className="inline-flex items-center gap-2">
      <span className="relative inline-flex">
        <select
          aria-label="Status do orçamento"
          value={atual}
          onChange={(e) => {
            const novo = e.target.value as StatusOrcamento;
            setSalvo(false);
            iniciar(async () => {
              mostrar(novo);
              await alterarStatus(id, novo);
              setSalvo(true);
              setTimeout(() => setSalvo(false), 2500);
            });
          }}
          className={`min-h-11 cursor-pointer appearance-none rounded-full border-0 py-2 pr-9 pl-4 text-[15px] font-semibold ${STATUS[atual].estilo}`}
        >
          {LISTA_STATUS.map((s) => (
            <option key={s} value={s}>
              {STATUS[s].rotulo}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 opacity-60" aria-hidden />
      </span>
      {salvando && <span className="text-sm text-gray-500">Salvando...</span>}
      {salvo && !salvando && <span className="text-sm text-green-700">Salvo ✓</span>}
    </span>
  );
}
