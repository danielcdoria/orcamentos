import { cache } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { after } from "next/server";
import { registrarAbertura, visitaContaComoAbertura } from "@/lib/abertura";
import { prisma } from "@/lib/prisma";
import { lerSessao } from "@/lib/sessao";
import { organizar, temOpcoes } from "@/lib/opcoes";
import { CAMPOS_ORCAMENTO_PUBLICO } from "@/lib/publico";
import { formatarCentavos } from "@/lib/dinheiro";
import { formatarData, formatarQuantidade } from "@/lib/formatos";
import { urlBase } from "@/lib/url";
import { formatarTelefone, telefoneParaWhatsApp } from "@/lib/telefone";
import { Phone } from "lucide-react";
import { BotaoPdf } from "./botao-pdf";
import { CaixaTotal, LinkResponder } from "./blocos";
import {
  OpcoesDoCliente,
  PdfComEscolha,
  ProvedorEscolha,
  ResponderComEscolha,
  TotalAoVivo,
  type ItemEscolha,
} from "./escolha";

// PÁGINA PÚBLICA do orçamento: /orcamento/<token>
// Fica FORA da pasta (app), então não exige login. Quem tem o link, vê.
// A segurança está no token: 64 caracteres aleatórios, impossível de adivinhar.

// cache(): a busca roda uma vez só, mesmo sendo usada pelo título (generateMetadata) e pela página.
const buscarOrcamento = cache(async (token: string) => {
  if (!/^[a-f0-9]{64}$/.test(token)) return null; // nem consulta o banco se o formato for inválido
  // Só os campos que o cliente pode ver (ver src/lib/publico.ts): o custo nem sai do banco.
  return prisma.orcamento.findUnique({
    where: { token },
    select: {
      ...CAMPOS_ORCAMENTO_PUBLICO,
      status: true, // usado só aqui no servidor (orçamento fechado trava as opções); não vai para a tela
      empresa: { select: { nome: true, telefone: true, logoUrl: true, condicaoPagamento: true } },
    },
  });
});

// "tel:+5521999998888" (com país) ou, se não reconhecer o número, só os dígitos.
function linkLigacao(telefone: string): string {
  const completo = telefoneParaWhatsApp(telefone);
  return completo ? `tel:+${completo}` : `tel:${telefone.replace(/\D/g, "")}`;
}

// Título e descrição que aparecem na prévia do link no WhatsApp.
export async function generateMetadata(props: PageProps<"/orcamento/[token]">): Promise<Metadata> {
  const { token } = await props.params;
  const o = await buscarOrcamento(token);
  if (!o) return { title: "Orçamento não encontrado" };

  const titulo = `Orçamento nº ${o.numero} · ${o.empresa.nome}`;
  const descricao = `Para ${o.cliente.nome} · Total ${formatarCentavos(o.total)} · Válido até ${formatarData(o.validoAte)}`;
  // Com logo: a aba e a prévia do WhatsApp mostram o logo da empresa.
  // Sem logo: ficam o ícone e a imagem neutros do sistema.
  const logo = o.empresa.logoUrl ? `${await urlBase()}${o.empresa.logoUrl}` : null;
  return {
    title: titulo,
    description: descricao,
    // só troca o ícone quando há logo; sem logo, fica o ícone neutro definido no layout raiz
    ...(logo && { icons: { icon: logo, apple: logo } }),
    openGraph: {
      title: titulo,
      description: descricao,
      type: "website",
      // o WhatsApp precisa do endereço completo da imagem
      images: [logo ?? `${await urlBase()}/og-padrao.png`],
    },
    robots: { index: false, follow: false }, // não aparecer no Google
  };
}

export default async function OrcamentoPublico(props: PageProps<"/orcamento/[token]">) {
  const { token } = await props.params;
  const o = await buscarOrcamento(token);
  if (!o) notFound();

  // after(): grava a abertura DEPOIS de enviar a página, para não deixá-la mais lenta.
  if (await visitaContaComoAbertura(o.empresaId)) {
    after(() => registrarAbertura(o.id));
  }

  const vencido = o.validoAte < new Date();

  // Botão para o cliente responder a empresa, só se o telefone da empresa for celular
  // (55 + DDD + 9 dígitos começando com 9). Fixo pode não ter WhatsApp.
  const whatsEmpresa = telefoneParaWhatsApp(o.empresa.telefone);
  const empresaTemCelular = whatsEmpresa !== null && /^55\d{2}9\d{8}$/.test(whatsEmpresa);
  const textoResposta = `Olá! Vi o orçamento nº ${o.numero} (${formatarCentavos(o.total)}).`;

  // Orçamento com opções (itens "opção" ou "adicional"): o cliente escolhe e o total muda
  // na hora. Sem opções, a página é montada inteira no servidor, como sempre foi.
  const opcoes = temOpcoes(o.itens);
  const { fixos } = organizar(o.itens);
  const previa = opcoes && (await lerSessao())?.empresaId === o.empresaId; // a empresa conferindo
  // Só os campos que o cliente pode ver, um por um
  const itensEscolha: ItemEscolha[] = o.itens.map((i) => ({
    id: i.id,
    descricao: i.descricao,
    quantidade: formatarQuantidade(i.quantidade),
    unitario: i.precoUnitario,
    subtotal: i.subtotal,
    tipo: i.tipo,
    grupo: i.grupo,
    incluido: i.incluido,
  }));

  const conteudo = (
    <>
      <article className="mx-auto max-w-2xl overflow-hidden rounded-2xl border border-gray-200 bg-white print:max-w-none print:rounded-none print:border-0">
        {/* Empresa */}
        <header className="flex items-center gap-4 px-5 py-5 sm:px-8 sm:py-6">
          {o.empresa.logoUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={o.empresa.logoUrl}
              alt={`Logo ${o.empresa.nome}`}
              className="size-16 shrink-0 rounded-xl object-contain"
            />
          )}
          <div className="min-w-0">
            <p className="text-xl leading-tight font-bold">{o.empresa.nome}</p>
            {o.empresa.telefone && (
              // Link de ligação: o cliente toca no número e liga para a empresa.
              <a
                href={linkLigacao(o.empresa.telefone)}
                className="mt-1 inline-flex min-h-8 items-center gap-1.5 text-base text-gray-600"
              >
                <Phone className="size-4" aria-hidden />
                {formatarTelefone(o.empresa.telefone)}
              </a>
            )}
          </div>
        </header>

        {/* Faixa do documento: número, data e validade */}
        <section className="border-y border-gray-200 bg-gray-50 px-5 py-4 sm:px-8">
          <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
            <div>
              <p className="text-sm font-semibold tracking-widest text-gray-500 uppercase">Orçamento</p>
              <h1 className="text-3xl font-bold">Nº {o.numero}</h1>
            </div>
            <dl className="flex gap-6 text-base">
              <div>
                <dt className="text-sm text-gray-500">Data</dt>
                <dd className="font-semibold">{formatarData(o.criadoEm)}</dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500">Válido até</dt>
                <dd className={`font-semibold ${vencido ? "text-red-700" : ""}`}>
                  {formatarData(o.validoAte)}
                </dd>
              </div>
            </dl>
          </div>
          {vencido && (
            <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-base text-red-800">
              Este orçamento venceu. Fale com {o.empresa.nome} para confirmar os valores.
            </p>
          )}
        </section>

        {/* Cliente */}
        <section className="px-5 pt-5 sm:px-8">
          <p className="text-sm text-gray-500">Para</p>
          <p className="text-lg font-semibold">{o.cliente.nome}</p>
          {o.cliente.telefone && <p className="text-base text-gray-600">{formatarTelefone(o.cliente.telefone)}</p>}
        </section>

        {/* Itens: no celular, cada item em duas linhas; a partir de 640px, tabela.
            Com opções, aqui ficam só os itens fixos; as opções vêm logo abaixo. */}
        {fixos.length > 0 && (
          <section className="px-5 pt-6 sm:px-8">
            <h2 className={opcoes ? "mb-2 text-lg font-semibold" : "sr-only"}>{opcoes ? "Já incluído" : "Itens"}</h2>
            <ul className="divide-y divide-gray-200 border-y border-gray-200 sm:hidden">
              {fixos.map((item) => (
                <li key={item.id} className="flex items-start justify-between gap-4 py-3 break-inside-avoid">
                  <div className="min-w-0">
                    <p className="text-base font-medium">{item.descricao}</p>
                    <p className="text-base text-gray-600">
                      {formatarQuantidade(item.quantidade)} × {formatarCentavos(item.precoUnitario)}
                    </p>
                  </div>
                  <p className="shrink-0 text-base font-semibold tabular-nums">{formatarCentavos(item.subtotal)}</p>
                </li>
              ))}
            </ul>
            <table className="hidden w-full text-base sm:table">
              <thead>
                <tr className="border-b border-gray-300 text-left text-sm text-gray-500">
                  <th className="py-2 font-medium">Descrição</th>
                  <th className="py-2 text-right font-medium">Qtd</th>
                  <th className="py-2 text-right font-medium">Valor unit.</th>
                  <th className="py-2 text-right font-medium">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {fixos.map((item) => (
                  <tr key={item.id} className="break-inside-avoid">
                    <td className="py-3 pr-4">{item.descricao}</td>
                    <td className="py-3 text-right tabular-nums">{formatarQuantidade(item.quantidade)}</td>
                    <td className="py-3 pl-4 text-right tabular-nums">{formatarCentavos(item.precoUnitario)}</td>
                    <td className="py-3 pl-4 text-right font-semibold tabular-nums">{formatarCentavos(item.subtotal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}

        {/* Opções que o cliente escolhe (grupos e adicionais) */}
        {opcoes && <OpcoesDoCliente />}

        {/* Total */}
        {opcoes ? <TotalAoVivo /> : <CaixaTotal valor={o.total} />}

        {/* Condições */}
        <section className="flex flex-col gap-4 px-5 py-6 text-base sm:px-8">
          {o.empresa.condicaoPagamento && (
            <div>
              <h2 className="font-semibold">Condição de pagamento</h2>
              <p className="mt-1 whitespace-pre-line text-gray-700">{o.empresa.condicaoPagamento}</p>
            </div>
          )}
          <div>
            <h2 className="font-semibold">Validade</h2>
            <p className="mt-1 text-gray-700">Este orçamento é válido até {formatarData(o.validoAte)}.</p>
          </div>
          {o.observacao && (
            <div>
              <h2 className="font-semibold">Observações</h2>
              <p className="mt-1 whitespace-pre-line text-gray-700">{o.observacao}</p>
            </div>
          )}
        </section>
      </article>

      {/* Fora do documento: ações do cliente (somem na impressão) */}
      <div className="mx-auto mt-4 flex max-w-2xl flex-col gap-3 print:hidden">
        {empresaTemCelular &&
          (opcoes ? (
            <ResponderComEscolha whatsEmpresa={whatsEmpresa} numero={o.numero} />
          ) : (
            <LinkResponder whatsEmpresa={whatsEmpresa} texto={textoResposta} />
          ))}
        {opcoes ? <PdfComEscolha token={token} /> : <BotaoPdf token={token} />}
      </div>
    </>
  );

  return (
    <main className="min-h-dvh bg-gray-100 px-3 py-4 sm:px-6 sm:py-10 print:min-h-0 print:bg-white print:p-0">
      {opcoes ? (
        <ProvedorEscolha token={token} itens={itensEscolha} previa={previa} bloqueado={o.status === "fechado"}>
          {conteudo}
        </ProvedorEscolha>
      ) : (
        conteudo
      )}
    </main>
  );
}
