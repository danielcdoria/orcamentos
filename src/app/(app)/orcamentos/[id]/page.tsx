import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, Download, Eye } from "lucide-react";
import { exigirSessao } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatarCentavos } from "@/lib/dinheiro";
import { formatarData, formatarDataHora, formatarQuantidade } from "@/lib/formatos";
import { urlBase } from "@/lib/url";
import { montarMensagem } from "@/lib/mensagem";
import { telefoneParaWhatsApp } from "@/lib/telefone";
import { BotoesEnvio } from "./botoes-envio";
import { SeletorStatus } from "@/components/seletor-status";
import { Aviso } from "@/components/aviso";
import { BlocoMargem } from "@/components/bloco-margem";
import { calcularMargem } from "@/lib/margem";
import { estiloBotaoSecundario, estiloCartao, estiloTitulo } from "@/components/estilos";

// Tela INTERNA de um orçamento (exige login). Daqui se envia e se acompanha o orçamento.
export default async function DetalheOrcamento(props: PageProps<"/orcamentos/[id]">) {
  const { id } = await props.params;
  const { ok } = await props.searchParams;
  const { empresaId } = await exigirSessao();

  const o = await prisma.orcamento.findFirst({
    where: { id, empresaId },
    include: {
      cliente: { select: { nome: true, telefone: true } },
      empresa: { select: { nome: true, mensagemEnvio: true } },
      cobrancas: { orderBy: { etapa: "asc" }, select: { etapa: true, enviadaEm: true } },
      itens: { orderBy: { id: "asc" } },
    },
  });
  if (!o) notFound();

  const linkPublico = `${await urlBase()}/orcamento/${o.token}`;

  // Mensagem já pronta do WhatsApp, a partir do modelo das Configurações.
  const mensagem = montarMensagem(o.empresa.mensagemEnvio, {
    cliente: o.cliente.nome,
    link: linkPublico,
    numero: String(o.numero),
    valor: formatarCentavos(o.total),
    validade: formatarData(o.validoAte),
    empresa: o.empresa.nome,
  });
  const telefone = telefoneParaWhatsApp(o.cliente.telefone);
  // wa.me/<número>?text=<mensagem>. Sem número, o WhatsApp deixa escolher o contato.
  const urlWhatsApp = `https://wa.me/${telefone ?? ""}?text=${encodeURIComponent(mensagem)}`;

  // Histórico do orçamento, em ordem
  const historico: string[] = [`Criado em ${formatarDataHora(o.criadoEm)}`];
  if (o.enviadoEm) historico.push(`Enviado em ${formatarDataHora(o.enviadoEm)}`);
  if (o.abertoEm) {
    historico.push(
      `O cliente viu em ${formatarDataHora(o.abertoEm)}${o.vezesAberto > 1 ? ` (voltou a olhar ${o.vezesAberto - 1}x)` : ""}`,
    );
  }
  for (const c of o.cobrancas) historico.push(`${c.etapa}ª cobrança enviada em ${formatarDataHora(c.enviadaEm)}`);

  return (
    <div className="flex flex-col gap-6">
      <Link href="/orcamentos" className="-ml-2 flex min-h-11 w-fit items-center gap-1 px-2 text-base text-gray-700">
        <ChevronLeft className="size-5" aria-hidden />
        Orçamentos
      </Link>

      <Aviso codigo={ok} />

      <div>
        <h1 className={estiloTitulo}>Orçamento nº {o.numero}</h1>
        <p className="mt-1 text-lg">{o.cliente.nome}</p>
        <p className="text-base text-gray-600">
          {formatarData(o.criadoEm)} · válido até {formatarData(o.validoAte)}
        </p>
        <div className="mt-3">
          <SeletorStatus id={o.id} status={o.status} />
        </div>
      </div>

      <div className={`${estiloCartao} flex flex-wrap items-center justify-between gap-x-6 gap-y-1 px-5 py-5`}>
        <span className="text-lg font-medium">Total</span>
        <span className="text-3xl font-extrabold text-marca tabular-nums">{formatarCentavos(o.total)}</span>
      </div>

      {/* Custo e margem: interno (esta tela exige login). Só aparece se houver custo. */}
      <BlocoMargem
        resumo={calcularMargem(
          o.itens.map((i) => ({ quantidade: Number(i.quantidade), subtotal: i.subtotal, custoUnitario: i.custoUnitario })),
        )}
      />

      <BotoesEnvio
        orcamentoId={o.id}
        link={linkPublico}
        urlWhatsApp={urlWhatsApp}
        temTelefone={telefone !== null}
        jaEnviado={o.enviadoEm !== null}
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {/* <a> comum (e não <Link>): o <Link> do Next "pré-carrega" a página em segundo plano. */}
        <a href={linkPublico} target="_blank" rel="noopener" className={estiloBotaoSecundario}>
          <Eye className="size-5" aria-hidden />
          Ver como o cliente vê
        </a>
        <a href={`/orcamento/${o.token}/pdf`} download className={estiloBotaoSecundario}>
          <Download className="size-5" aria-hidden />
          Baixar PDF
        </a>
      </div>

      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold">Itens</h2>
        <ul className={`${estiloCartao} divide-y divide-gray-200`}>
          {o.itens.map((item) => (
            <li key={item.id} className="flex items-start justify-between gap-4 px-4 py-3">
              <div className="min-w-0">
                <p className="text-base">{item.descricao}</p>
                <p className="text-base text-gray-600">
                  {formatarQuantidade(item.quantidade)} × {formatarCentavos(item.precoUnitario)}
                  {item.custoUnitario !== null && (
                    <span className="text-sm text-gray-500"> · custo {formatarCentavos(item.custoUnitario)}</span>
                  )}
                </p>
              </div>
              <p className="shrink-0 text-base font-semibold">{formatarCentavos(item.subtotal)}</p>
            </li>
          ))}
        </ul>
      </section>

      {o.observacao && (
        <section className="flex flex-col gap-2">
          <h2 className="text-lg font-semibold">Observação</h2>
          <p className="text-base whitespace-pre-line text-gray-800">{o.observacao}</p>
        </section>
      )}

      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold">Histórico</h2>
        <ol className="flex flex-col gap-2 border-l-2 border-gray-200 pl-4">
          {historico.map((linha) => (
            <li key={linha} className="text-base text-gray-700">
              {linha}
            </li>
          ))}
          {!o.abertoEm && o.enviadoEm && <li className="text-base text-gray-500">O cliente ainda não viu.</li>}
        </ol>
      </section>
    </div>
  );
}
