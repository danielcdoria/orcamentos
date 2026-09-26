import Link from "next/link";
import { notFound } from "next/navigation";
import { exigirSessao } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatarCentavos } from "@/lib/dinheiro";
import { formatarData, formatarDataHora, formatarQuantidade } from "@/lib/formatos";
import { urlBase } from "@/lib/url";
import { montarMensagem } from "@/lib/mensagem";
import { telefoneParaWhatsApp } from "@/lib/telefone";
import { BotoesEnvio } from "./botoes-envio";
import { SeletorStatus } from "@/components/seletor-status";
import { estiloBotaoSecundario } from "@/components/estilos";

// Tela INTERNA de um orçamento (exige login). Daqui se abre a página pública.
export default async function DetalheOrcamento(props: PageProps<"/orcamentos/[id]">) {
  const { id } = await props.params;
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

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/orcamentos" className="text-sm text-gray-600 hover:text-gray-900">
          ← Orçamentos
        </Link>
        <h1 className="mt-2 text-2xl font-bold">Orçamento nº {o.numero}</h1>
        <p className="mt-1 text-gray-600">
          {o.cliente.nome} · {formatarData(o.criadoEm)}
        </p>
        <div className="mt-3">
          <SeletorStatus id={o.id} status={o.status} />
        </div>
      </div>

      {o.enviadoEm && (
        <p className="rounded-lg bg-blue-50 px-4 py-3 text-sm text-blue-800">
          Enviado pelo WhatsApp em {formatarDataHora(o.enviadoEm)}.
        </p>
      )}

      {o.cobrancas.map((c) => (
        <p key={c.etapa} className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {c.etapa}ª cobrança enviada em {formatarDataHora(c.enviadaEm)}.
        </p>
      ))}

      <p
        className={`rounded-lg px-4 py-3 text-sm ${
          o.abertoEm ? "bg-green-50 text-green-800" : "bg-gray-50 text-gray-600"
        }`}
      >
        {o.abertoEm
          ? `O cliente abriu em ${formatarDataHora(o.abertoEm)}${
              o.vezesAberto > 1 ? ` (${o.vezesAberto} vezes no total)` : ""
            }.`
          : "O cliente ainda não abriu este orçamento."}
      </p>

      <div className="flex items-center justify-between rounded-lg bg-gray-100 px-4 py-4">
        <span className="font-medium">Total</span>
        <span className="text-xl font-bold">{formatarCentavos(o.total)}</span>
      </div>

      <ul className="divide-y divide-gray-200 rounded-lg border border-gray-200">
        {o.itens.map((item) => (
          <li key={item.id} className="flex items-start justify-between gap-4 px-5 py-3">
            <div className="min-w-0">
              <span className="block">{item.descricao}</span>
              <span className="block text-sm text-gray-600">
                {formatarQuantidade(item.quantidade)} × {formatarCentavos(item.precoUnitario)}
              </span>
            </div>
            <span className="shrink-0">{formatarCentavos(item.subtotal)}</span>
          </li>
        ))}
      </ul>

      {o.observacao && (
        <div>
          <h2 className="text-sm font-medium text-gray-700">Observação</h2>
          <p className="mt-1 whitespace-pre-line">{o.observacao}</p>
        </div>
      )}

      <BotoesEnvio
        orcamentoId={o.id}
        link={linkPublico}
        urlWhatsApp={urlWhatsApp}
        temTelefone={telefone !== null}
      />

      <div className="flex flex-col gap-1">
        {/* <a> comum (e não <Link>) de propósito: o <Link> do Next "pré-carrega" a página
            em segundo plano. */}
        <a href={linkPublico} target="_blank" rel="noopener" className={estiloBotaoSecundario}>
          Ver como o cliente vê
        </a>
        <p className="break-all text-center text-xs text-gray-500">{linkPublico}</p>
      </div>

      <Link href="/orcamentos/novo" className={estiloBotaoSecundario}>
        + Novo orçamento
      </Link>
    </div>
  );
}
