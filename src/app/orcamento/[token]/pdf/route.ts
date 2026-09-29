import { createElement } from "react";
import { renderToBuffer } from "@react-pdf/renderer";
import { prisma } from "@/lib/prisma";
import { CAMPOS_ORCAMENTO_PUBLICO } from "@/lib/publico";
import { formatarCentavos } from "@/lib/dinheiro";
import { formatarData, formatarQuantidade } from "@/lib/formatos";
import { formatarTelefone } from "@/lib/telefone";
import { DocumentoPdf, type DadosPdf } from "./documento-pdf";

// PDF do orçamento: GET /orcamento/<token>/pdf -> baixa o arquivo direto.
// Público como a página do orçamento: quem tem o link (o token) pode baixar.

// "Oficina Silva" -> "oficina-silva" (para o nome do arquivo)
function paraNomeDeArquivo(texto: string) {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export async function GET(_req: Request, ctx: RouteContext<"/orcamento/[token]/pdf">) {
  const { token } = await ctx.params;
  if (!/^[a-f0-9]{64}$/.test(token)) return new Response("Orçamento não encontrado", { status: 404 });

  // Só os campos que o cliente pode ver (ver src/lib/publico.ts): o custo nem sai do banco.
  const o = await prisma.orcamento.findUnique({
    where: { token },
    select: {
      ...CAMPOS_ORCAMENTO_PUBLICO,
      empresa: { select: { nome: true, telefone: true, condicaoPagamento: true, logo: true } },
    },
  });
  if (!o) return new Response("Orçamento não encontrado", { status: 404 });

  // A biblioteca de PDF só aceita PNG ou JPG; outros formatos ficam sem logo.
  const logo = o.empresa.logo;
  const logoAceito = logo && (logo.tipo === "image/png" || logo.tipo === "image/jpeg");

  const dados: DadosPdf = {
    numero: o.numero,
    data: formatarData(o.criadoEm),
    validoAte: formatarData(o.validoAte),
    vencido: o.validoAte < new Date(),
    empresa: {
      nome: o.empresa.nome,
      telefone: formatarTelefone(o.empresa.telefone),
      logo: logoAceito ? Buffer.from(logo.dados) : null,
      condicaoPagamento: o.empresa.condicaoPagamento,
    },
    cliente: { nome: o.cliente.nome, telefone: formatarTelefone(o.cliente.telefone) },
    itens: o.itens.map((i) => ({
      descricao: i.descricao,
      quantidade: formatarQuantidade(i.quantidade),
      unitario: formatarCentavos(i.precoUnitario),
      subtotal: formatarCentavos(i.subtotal),
    })),
    total: formatarCentavos(o.total),
    observacao: o.observacao,
  };

  const pdf = await renderToBuffer(createElement(DocumentoPdf, { d: dados }) as never);
  const nome = `orcamento-${o.numero}-${paraNomeDeArquivo(o.empresa.nome)}.pdf`;

  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      // "attachment" = baixar o arquivo (e não abrir dentro do site)
      "Content-Disposition": `attachment; filename="${nome}"`,
      "Cache-Control": "private, no-store",
      "X-Robots-Tag": "noindex",
    },
  });
}
