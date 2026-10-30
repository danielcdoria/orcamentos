"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { apagarSessao } from "@/lib/sessao";
import { exigirSessao } from "@/lib/auth";
import { NOME_COOKIE_AREA, lerArea } from "@/lib/area";

export async function sair() {
  await apagarSessao();
  redirect("/login");
}

// Botão Pousadas / Marcenarias do topo: guarda a área escolhida e recarrega as telas.
export async function trocarArea(valor: string) {
  await exigirSessao();
  (await cookies()).set(NOME_COOKIE_AREA, lerArea(valor), {
    sameSite: "lax",
    path: "/",
    maxAge: 365 * 24 * 60 * 60,
  });
  revalidatePath("/", "layout");
}
