// Nome e cor de cada etapa da negociação (depois que o cliente respondeu), num lugar só.
// Roda no servidor e no navegador.
import type { EtapaVenda, VezDe } from "@/generated/prisma/enums";

export const ETAPAS: Record<EtapaVenda, { rotulo: string; estilo: string }> = {
  interessado: { rotulo: "Interessado", estilo: "bg-sky-50 text-sky-900" },
  demonstracao: { rotulo: "Demonstração", estilo: "bg-violet-50 text-violet-900" },
  proposta: { rotulo: "Proposta enviada", estilo: "bg-amber-50 text-amber-900" },
  negociando: { rotulo: "Negociando", estilo: "bg-green-50 text-green-900" },
};

export const LISTA_ETAPAS = Object.keys(ETAPAS) as EtapaVenda[];

export const VEZ: Record<VezDe, string> = {
  eu: "Comigo",
  cliente: "Com o cliente",
};

export const LISTA_VEZ = Object.keys(VEZ) as VezDe[];

export const MAX_PROXIMO_PASSO = 200; // caracteres
