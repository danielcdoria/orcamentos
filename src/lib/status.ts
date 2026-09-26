// Nome e cor de cada status do orçamento, num lugar só.
// Cores só em tom suave: cinza (neutro), amarelo (atenção), verde (bom), vermelho (perdido).
import type { StatusOrcamento } from "@/generated/prisma/enums";

export const STATUS: Record<StatusOrcamento, { rotulo: string; estilo: string }> = {
  rascunho: { rotulo: "Rascunho", estilo: "bg-white text-gray-700 ring-1 ring-gray-300" },
  enviado: { rotulo: "Enviado", estilo: "bg-gray-100 text-gray-800" },
  aberto: { rotulo: "Aberto", estilo: "bg-amber-100 text-amber-900" },
  respondido: { rotulo: "Respondido", estilo: "bg-green-50 text-green-800" },
  fechado: { rotulo: "Fechado ✓", estilo: "bg-green-100 text-green-900" },
  perdido: { rotulo: "Perdido", estilo: "bg-red-50 text-red-800" },
};

export const LISTA_STATUS = Object.keys(STATUS) as StatusOrcamento[];

// Enquanto estiver num destes, o orçamento está "esperando o cliente" e entra na cobrança.
export const STATUS_AGUARDANDO: StatusOrcamento[] = ["enviado", "aberto"];
