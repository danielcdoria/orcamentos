// Dados de prospecção do cliente: nomes das abordagens, leitura do que foi digitado
// no formulário e o resumo mostrado na lista ("Lumiar · Mensagem antes · 4,5 ★").
// Roda no servidor e no navegador.
import type { Abordagem } from "@/generated/prisma/enums";

export const ABORDAGEM: Record<Abordagem, string> = {
  mensagem: "Mensagem antes",
  demo: "Site pronto antes",
};

export const LISTA_ABORDAGEM = Object.keys(ABORDAGEM) as Abordagem[];

// 4.5 -> "4,5"
export function formatarNota(nota: number): string {
  return nota.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

// "4,5" / "4.5" / "4" -> 4.5 / 4.5 / 4. Vazio -> null. Fora de 0 a 5 -> undefined (inválido).
export function lerNota(texto: string): number | null | undefined {
  const limpo = texto.trim().replace(",", ".");
  if (!limpo) return null;
  if (!/^\d(\.\d+)?$/.test(limpo)) return undefined;
  const nota = Math.round(Number(limpo) * 10) / 10;
  return nota >= 0 && nota <= 5 ? nota : undefined;
}

// "562" / "1.234" -> 562 / 1234. Vazio -> null. Inválido -> undefined.
export function lerAvaliacoes(texto: string): number | null | undefined {
  const limpo = texto.trim().replace(/\./g, "");
  if (!limpo) return null;
  if (!/^\d{1,9}$/.test(limpo)) return undefined;
  return Number(limpo);
}

// Link da demonstração. Aceita "pousadax.com.br" (põe o https://). Só http/https:
// o link vira um botão, e um "javascript:..." ali seria perigoso. Inválido -> undefined.
export function lerLinkDemo(texto: string): string | null | undefined {
  const limpo = texto.trim();
  if (!limpo) return null;
  const comProtocolo = /^[a-z][a-z0-9+.-]*:/i.test(limpo) ? limpo : `https://${limpo}`;
  try {
    const url = new URL(comProtocolo);
    if (url.protocol !== "https:" && url.protocol !== "http:") return undefined;
    if (!url.hostname.includes(".")) return undefined;
    return url.toString();
  } catch {
    return undefined;
  }
}

// "Lumiar · Mensagem antes · 4,5 ★" (só o que estiver preenchido)
export function resumoProspeccao(c: {
  cidade: string | null;
  abordagem: Abordagem | null;
  notaGoogle: number | null;
}): string {
  return [c.cidade, c.abordagem && ABORDAGEM[c.abordagem], c.notaGoogle !== null && `${formatarNota(c.notaGoogle)} ★`]
    .filter(Boolean)
    .join(" · ");
}
