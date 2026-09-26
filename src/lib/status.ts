// Nome e cor de cada status do orçamento, num lugar só.
import type { StatusOrcamento } from "@/generated/prisma/enums";

export const STATUS: Record<StatusOrcamento, { rotulo: string; estilo: string }> = {
  rascunho: { rotulo: "Rascunho", estilo: "bg-gray-100 text-gray-700" },
  enviado: { rotulo: "Enviado", estilo: "bg-blue-100 text-blue-800" },
  aberto: { rotulo: "Aberto", estilo: "bg-indigo-100 text-indigo-800" },
  respondido: { rotulo: "Respondido", estilo: "bg-amber-100 text-amber-900" },
  fechado: { rotulo: "Fechado", estilo: "bg-green-700 text-white" },
  perdido: { rotulo: "Perdido", estilo: "bg-red-100 text-red-800" },
};

export const LISTA_STATUS = Object.keys(STATUS) as StatusOrcamento[];

// Enquanto estiver num destes, o orçamento está "esperando o cliente" e entra na cobrança.
export const STATUS_AGUARDANDO: StatusOrcamento[] = ["enviado", "aberto"];
