import "server-only";
import { headers } from "next/headers";

// Endereço base do site (ex.: https://orcamentos.vercel.app ou http://localhost:3000),
// descoberto a partir do pedido atual. Serve para montar links completos para enviar.
export async function urlBase(): Promise<string> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const protocolo = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${protocolo}://${host}`;
}
