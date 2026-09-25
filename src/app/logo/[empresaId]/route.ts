import { prisma } from "@/lib/prisma";

// Entrega a imagem do logo: GET /logo/<empresaId>
// É público porque aparece na página do orçamento, que o cliente abre sem login.
// (Um "route.ts" responde a um endereço com dados, em vez de montar uma página.)
export async function GET(_req: Request, ctx: RouteContext<"/logo/[empresaId]">) {
  const { empresaId } = await ctx.params;

  const logo = await prisma.empresaLogo.findUnique({ where: { empresaId } });
  if (!logo) return new Response("Logo não encontrado", { status: 404 });

  return new Response(logo.dados, {
    headers: {
      "Content-Type": logo.tipo,
      // O endereço muda a cada logo novo (?v=...), então o navegador pode guardar por 1 ano.
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
