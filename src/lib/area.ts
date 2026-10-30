import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import type { Area } from "@/generated/prisma/enums";

// ============================================================================
// ÁREAS: Pousadas e Marcenarias.
// Uma empresa com usaAreas ligado ganha no topo um botão para trocar de área. Cada área
// tem os seus clientes e o seu catálogo; os orçamentos seguem a área do cliente. Assim
// Hoje, Orçamentos, Cobrar hoje, Catálogo, Painel e Clientes mostram só a área escolhida.
//
// A área escolhida fica num cookie (não é segredo nem segurança: quem separa uma empresa
// da outra continua sendo o empresaId do login). Empresa sem usaAreas: area = null e os
// filtros abaixo não filtram nada, como sempre foi.
// ============================================================================

export const NOME_COOKIE_AREA = "area";

export const AREAS: { valor: Area; rotulo: string }[] = [
  { valor: "pousada", rotulo: "Pousadas" },
  { valor: "marcenaria", rotulo: "Marcenarias" },
];

export function lerArea(valor: unknown): Area {
  return valor === "marcenaria" ? "marcenaria" : "pousada";
}

// A área em uso agora, ou null se a empresa não usa áreas.
export const areaAtual = cache(async (empresaId: string): Promise<Area | null> => {
  const empresa = await prisma.empresa.findUnique({ where: { id: empresaId }, select: { usaAreas: true } });
  if (!empresa?.usaAreas) return null;
  return lerArea((await cookies()).get(NOME_COOKIE_AREA)?.value);
});

// Filtro para Cliente e Item: { area } ou nada.
export async function filtroArea(empresaId: string): Promise<{ area?: Area }> {
  const area = await areaAtual(empresaId);
  return area ? { area } : {};
}

// Filtro para Orcamento (pela área do cliente): { cliente: { area } } ou nada.
export async function filtroAreaOrcamento(empresaId: string): Promise<{ cliente?: { area: Area } }> {
  const area = await areaAtual(empresaId);
  return area ? { cliente: { area } } : {};
}

// Área para gravar num cliente ou item novo (pousada se a empresa não usa áreas).
export async function areaParaGravar(empresaId: string): Promise<Area> {
  return (await areaAtual(empresaId)) ?? "pousada";
}
