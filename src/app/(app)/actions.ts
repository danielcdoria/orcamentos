"use server";

import { redirect } from "next/navigation";
import { apagarSessao } from "@/lib/sessao";

export async function sair() {
  await apagarSessao();
  redirect("/login");
}
