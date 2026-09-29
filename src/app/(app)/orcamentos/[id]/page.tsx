import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, Download, Eye, Shuffle } from "lucide-react";
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
import { organizar, resumoEscolha, somarIncluidos, temOpcoes } from "@/lib/opcoes";
import { STATUS_AGUARDANDO } from "@/lib/status";
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
      escolhas: { orderBy: { criadaEm: "desc" }, select: { resumo: true, total: true, criadaEm: true } },
    },
  });
  if (!o) notFound();

  // Opções que o cliente escolhe: o que ele escolheu, quantas vezes mexeu e o que você propôs
  const opcoes = temOpcoes(o.itens);
  const { fixos, grupos, adicionais } = organizar(o.itens);
  const propostas = o.itens.map((i) => ({ ...i, incluido: i.tipo === "fixo" || (i.tipo === "opcao" && i.padrao) }));
  const totalProposto = somarIncluidos(propostas);
  const vezes = o.escolhas.length;
  const ultimaEscolha = o.escolhas[0];
  const voltouAoPadrao = vezes > 0 && resumoEscolha(o.itens) === resumoEscolha(propostas);
  const sinalDeDuvida = vezes > 0 && STATUS_AGUARDANDO.includes(o.status);

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

  // Histórico do orçamento, em ordem de data
  const eventos: { data: Date; texto: string }[] = [{ data: o.criadoEm, texto: `Criado em ${formatarDataHora(o.criadoEm)}` }];
  if (o.enviadoEm) eventos.push({ data: o.enviadoEm, texto: `Enviado em ${formatarDataHora(o.enviadoEm)}` });
  if (o.abertoEm) {
    eventos.push({
      data: o.abertoEm,
      texto: `O cliente viu em ${formatarDataHora(o.abertoEm)}${o.vezesAberto > 1 ? ` (voltou a olhar ${o.vezesAberto - 1}x)` : ""}`,
    });
  }
  for (const c of o.cobrancas) {
    eventos.push({ data: c.enviadaEm, texto: `${c.etapa}ª cobrança enviada em ${formatarDataHora(c.enviadaEm)}` });
  }
  for (const e of o.escolhas) {
    eventos.push({
      data: e.criadaEm,
      texto: `O cliente escolheu em ${formatarDataHora(e.criadaEm)}: ${e.resumo} (${formatarCentavos(e.total)})`,
    });
  }
  const historico = eventos.sort((a, b) => a.data.getTime() - b.data.getTime()).map((e) => e.texto);

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

      <div className={`${estiloCartao} px-5 py-5`}>
        <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-1">
          <span className="text-lg font-medium">Total</span>
          <span className="text-3xl font-extrabold text-marca tabular-nums">{formatarCentavos(o.total)}</span>
        </div>
        {opcoes && (
          <p className="mt-2 text-sm text-gray-600">
            {vezes === 0
              ? "Com as opções padrão (o cliente ainda não mexeu)."
              : `Com a escolha do cliente. Você propôs ${formatarCentavos(totalProposto)} com as opções padrão.`}
          </p>
        )}
      </div>

      {/* O que o cliente escolheu nas opções, e se ficou trocando */}
      {opcoes && (
        <section
          aria-label="Escolha do cliente"
          className={`rounded-2xl px-4 py-4 text-base ${sinalDeDuvida ? "bg-amber-50 ring-1 ring-amber-300" : "bg-gray-50"}`}
        >
          <p className="flex items-center gap-2 font-semibold">
            <Shuffle className="size-5 shrink-0" aria-hidden />
            {vezes === 0
              ? "O cliente ainda não mexeu nas opções"
              : `O cliente mexeu nas opções ${vezes === 1 ? "1 vez" : `${vezes} vezes`}`}
          </p>
          {ultimaEscolha && (
            <p className="mt-1 text-gray-800">
              Escolha atual ({formatarDataHora(ultimaEscolha.criadaEm)}): {resumoEscolha(o.itens)}
              {voltouAoPadrao && " (voltou para o padrão que você deixou)"}
            </p>
          )}
          {sinalDeDuvida && (
            <p className="mt-2 font-medium text-amber-900">
              Mexeu nas opções e ainda não respondeu: pode ser dúvida de preço. Vale puxar conversa.
            </p>
          )}
        </section>
      )}

      {/* Custo e margem: interno (esta tela exige login). Só aparece se houver custo.
          Considera o que está incluído agora (a escolha do cliente). */}
      <BlocoMargem
        resumo={calcularMargem(
          o.itens
            .filter((i) => i.incluido)
            .map((i) => ({ quantidade: Number(i.quantidade), subtotal: i.subtotal, custoUnitario: i.custoUnitario })),
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
        {fixos.length > 0 && <ListaItens itens={fixos} />}
        {grupos.map((g) => (
          <div key={g.nome} className="mt-2 flex flex-col gap-2">
            <h3 className="text-base font-semibold">
              {g.nome} <span className="font-normal text-gray-600">· o cliente escolhe 1</span>
            </h3>
            <ListaItens itens={g.itens} />
          </div>
        ))}
        {adicionais.length > 0 && (
          <div className="mt-2 flex flex-col gap-2">
            <h3 className="text-base font-semibold">
              Adicionais <span className="font-normal text-gray-600">· o cliente marca se quiser</span>
            </h3>
            <ListaItens itens={adicionais} />
          </div>
        )}
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

type ItemDoOrcamento = {
  id: string;
  descricao: string;
  quantidade: { toString(): string };
  precoUnitario: number;
  subtotal: number;
  custoUnitario: number | null;
  tipo: "fixo" | "opcao" | "adicional";
  padrao: boolean;
  incluido: boolean;
};

// Lista de itens. Em opções e adicionais, mostra o que está escolhido agora (e qual era o padrão).
function ListaItens({ itens }: { itens: ItemDoOrcamento[] }) {
  return (
    <ul className={`${estiloCartao} divide-y divide-gray-200`}>
      {itens.map((item) => (
        <li key={item.id} className="flex items-start justify-between gap-4 px-4 py-3">
          <div className="min-w-0">
            <p className={`text-base ${item.incluido ? "" : "text-gray-500"}`}>{item.descricao}</p>
            <p className="text-base text-gray-600">
              {formatarQuantidade(item.quantidade)} × {formatarCentavos(item.precoUnitario)}
              {item.custoUnitario !== null && (
                <span className="text-sm text-gray-500"> · custo {formatarCentavos(item.custoUnitario)}</span>
              )}
            </p>
            {item.tipo !== "fixo" && (
              <p className="mt-1 flex flex-wrap gap-2 text-sm font-medium">
                {item.incluido ? (
                  <span className="rounded-full bg-green-50 px-2 py-0.5 text-green-800">
                    ✓ {item.tipo === "opcao" ? "Escolhida" : "Marcado"}
                  </span>
                ) : (
                  <span className="rounded-full px-2 py-0.5 text-gray-600 ring-1 ring-gray-300">
                    {item.tipo === "opcao" ? "Não escolhida" : "Não marcado"}
                  </span>
                )}
                {item.tipo === "opcao" && item.padrao && (
                  <span className="rounded-full bg-gray-100 px-2 py-0.5 text-gray-700">Padrão</span>
                )}
              </p>
            )}
          </div>
          <p className={`shrink-0 text-base font-semibold ${item.incluido ? "" : "text-gray-500"}`}>
            {formatarCentavos(item.subtotal)}
          </p>
        </li>
      ))}
    </ul>
  );
}
