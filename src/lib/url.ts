import "server-only";
import { networkInterfaces } from "node:os";
import { headers } from "next/headers";

// Endereço do Mac na rede de casa (ex.: 192.168.0.35), descoberto na hora.
function ipDaRedeLocal(): string | null {
  for (const lista of Object.values(networkInterfaces())) {
    for (const rede of lista ?? []) {
      if (rede.family === "IPv4" && !rede.internal) return rede.address;
    }
  }
  return null;
}

// Endereço base do site (ex.: https://orcamentos.vercel.app ou http://localhost:3000),
// descoberto a partir do pedido atual. Serve para montar links completos para enviar.
export async function urlBase(): Promise<string> {
  const h = await headers();
  let host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const protocolo = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");

  // Só no desenvolvimento (npm run dev): "localhost" significa "este aparelho", então um
  // link com localhost não abre no celular. Trocamos pelo IP do Mac na rede de casa.
  // No site publicado isto não acontece (o endereço é o da Vercel).
  if (process.env.NODE_ENV === "development" && /^(localhost|127\.0\.0\.1)(:|$)/.test(host)) {
    const ip = ipDaRedeLocal();
    if (ip) host = host.replace(/^(localhost|127\.0\.0\.1)/, ip);
    return `http://${host}`;
  }

  return `${protocolo}://${host}`;
}
