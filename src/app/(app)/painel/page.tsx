import Link from "next/link";
import { exigirSessao } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatarCentavos } from "@/lib/dinheiro";
import { marcarPerdidosVencidos } from "@/lib/cobranca";
import { mesAtual } from "@/lib/mes";
import { LISTA_STATUS, STATUS, STATUS_AGUARDANDO } from "@/lib/status";
import { ABORDAGEM, LISTA_ABORDAGEM } from "@/lib/prospeccao";
import type { Abordagem, StatusOrcamento } from "@/generated/prisma/enums";
import { estiloCartao, estiloTitulo } from "@/components/estilos";

// PAINEL: os quatro números do mês, o funil de todos os tempos e a comparação das abordagens.
// O mais importante é o "valor parado": é o dinheiro que está na mesa esperando resposta,
// e é o que a tela "Cobrar hoje" ajuda a recuperar.

// Rascunho e Aberto quase não aparecem no uso de prospecção: só entram no funil se houver algum.
const SO_SE_TIVER: StatusOrcamento[] = ["rascunho", "aberto"];
const RESPONDEU: StatusOrcamento[] = ["respondido", "fechado"];
const POUCOS_DADOS = 30; // abaixo disso, a diferença entre as abordagens ainda pode ser sorte

export default async function Painel() {
  const { empresaId } = await exigirSessao();
  const { inicio, fim, nome } = mesAtual();

  // Aplica a regra de perdidos antes, para o valor parado não incluir quem já venceu.
  const empresa = await prisma.empresa.findUniqueOrThrow({
    where: { id: empresaId },
    select: { prazoPerdido: true },
  });
  await marcarPerdidosVencidos(empresaId, empresa.prazoPerdido);

  const doMes = { empresaId, enviadoEm: { gte: inicio, lt: fim } };
  // Comparação das abordagens, contando POUSADAS (clientes), não orçamentos: quem tem dois
  // orçamentos por engano conta uma vez só.
  // - abordada: tem pelo menos um orçamento que não é rascunho
  // - respondeu: tem algum orçamento AGORA em Respondido ou Fechado (o sistema não guarda o
  //   histórico de status, então quem respondeu e depois virou Perdido não conta)
  const comOrcamento = (status: StatusOrcamento[]) => ({
    empresaId,
    orcamentos: { some: { status: { in: status } } },
  });
  const [enviados, fechados, parado, porStatus, abordadas, responderam] = await Promise.all([
    prisma.orcamento.count({ where: doMes }),
    // Fechados ENTRE os enviados neste mês (assim a taxa fica sempre entre 0% e 100%)
    prisma.orcamento.count({ where: { ...doMes, status: "fechado" } }),
    // Parado = tudo que está esperando resposta agora, de qualquer mês
    prisma.orcamento.aggregate({
      where: { empresaId, status: { in: STATUS_AGUARDANDO } },
      _sum: { total: true },
      _count: true,
    }),
    prisma.orcamento.groupBy({ by: ["status"], where: { empresaId }, _count: { _all: true } }),
    prisma.cliente.groupBy({
      by: ["abordagem"],
      where: comOrcamento(LISTA_STATUS.filter((s) => s !== "rascunho")),
      _count: { _all: true },
    }),
    prisma.cliente.groupBy({ by: ["abordagem"], where: comOrcamento(RESPONDEU), _count: { _all: true } }),
  ]);

  // Funil: quantos orçamentos em cada status, desde o início
  const contagem = new Map(porStatus.map((g) => [g.status, g._count._all]));
  const totalOrcamentos = porStatus.reduce((soma, g) => soma + g._count._all, 0);
  const funil = LISTA_STATUS.map((s) => ({ status: s, n: contagem.get(s) ?? 0 })).filter(
    (l) => !SO_SE_TIVER.includes(l.status) || l.n > 0,
  );

  // Abordagens: uma linha para cada, mais "Sem abordagem" (abordagem = null)
  const abordadasPor = new Map(abordadas.map((g) => [g.abordagem, g._count._all]));
  const responderamPor = new Map(responderam.map((g) => [g.abordagem, g._count._all]));
  const linha = (a: Abordagem | null) => {
    const total = abordadasPor.get(a) ?? 0;
    const resp = responderamPor.get(a) ?? 0;
    const taxa = total > 0 ? Math.round((resp / total) * 100) : null;
    return { rotulo: a ? ABORDAGEM[a] : "Sem abordagem", total, resp, taxa };
  };
  const comparacao = LISTA_ABORDAGEM.map(linha);
  const semAbordagem = linha(null);
  const poucosDados = comparacao.some((l) => l.total < POUCOS_DADOS);

  const taxa = enviados > 0 ? Math.round((fechados / enviados) * 100) : 0;
  const valorParado = parado._sum.total ?? 0;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className={estiloTitulo}>Painel</h1>
        <p className="mt-1 text-base text-gray-600 first-letter:uppercase">{nome}</p>
      </div>

      {/* O número que vende o produto */}
      <section className={`${estiloCartao} px-5 py-6`}>
        <p className="text-base font-medium text-gray-700">Dinheiro parado esperando resposta</p>
        <p className="mt-2 text-4xl font-extrabold tracking-tight text-marca tabular-nums sm:text-5xl">
          {formatarCentavos(valorParado)}
        </p>
        <p className="mt-3 text-base text-gray-600">
          {parado._count === 1
            ? "Em 1 orçamento enviado que o cliente ainda não respondeu."
            : `Em ${parado._count} orçamentos enviados que os clientes ainda não responderam.`}
        </p>
      </section>

      <section className="grid grid-cols-3 gap-3">
        <Numero rotulo="Enviados no mês" valor={String(enviados)} />
        <Numero rotulo="Fechados" valor={String(fechados)} />
        <Numero rotulo="Taxa de fechamento" valor={`${taxa}%`} />
      </section>

      <p className="text-sm text-gray-500">
        Enviados, fechados e taxa contam os orçamentos enviados neste mês. O dinheiro parado soma
        todos os orçamentos que estão como Enviado ou Aberto.
      </p>

      {/* Funil de todos os tempos */}
      <section className="flex flex-col gap-3">
        <h2 className="text-xl font-bold text-gray-900">Todos os orçamentos, por status</h2>
        <ul className={`${estiloCartao} divide-y divide-gray-200`}>
          {funil.map(({ status, n }) => (
            <li key={status}>
              <Link href={`/orcamentos?status=${status}`} className="flex min-h-14 items-center gap-3 px-4 py-3 hover:bg-gray-50">
                <span className="w-28 shrink-0 text-base text-gray-800">{STATUS[status].rotulo.replace(" ✓", "")}</span>
                <span className="h-3 flex-1 overflow-hidden rounded-full bg-gray-100" aria-hidden>
                  <span
                    className="block h-full rounded-full bg-gray-400"
                    style={{ width: `${totalOrcamentos > 0 ? (n / totalOrcamentos) * 100 : 0}%` }}
                  />
                </span>
                <span className="w-12 shrink-0 text-right text-lg font-bold tabular-nums">{n}</span>
              </Link>
            </li>
          ))}
        </ul>
        <p className="text-sm text-gray-500">
          {totalOrcamentos === 1 ? "1 orçamento" : `${totalOrcamentos} orçamentos`} desde o início. Toque num status
          para ver a lista.
        </p>
      </section>

      {/* Qual abordagem dá mais resposta */}
      <section className="flex flex-col gap-3">
        <h2 className="text-xl font-bold text-gray-900">Qual abordagem dá mais resposta</h2>
        <div className={`${estiloCartao} overflow-hidden`}>
          <table className="w-full text-left text-base">
            <thead className="bg-gray-50 text-sm text-gray-600">
              <tr>
                <th scope="col" className="px-4 py-2 font-medium">Abordagem</th>
                <th scope="col" className="px-2 py-2 text-right font-medium">Abordadas</th>
                <th scope="col" className="px-2 py-2 text-right font-medium">Respond.</th>
                <th scope="col" className="py-2 pr-4 pl-2 text-right font-medium">Taxa</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {comparacao.map((l) => (
                <tr key={l.rotulo}>
                  <th scope="row" className="px-4 py-3 font-semibold text-gray-900">{l.rotulo}</th>
                  <td className="px-2 py-3 text-right tabular-nums">{l.total}</td>
                  <td className="px-2 py-3 text-right tabular-nums">{l.resp}</td>
                  <td className="py-3 pr-4 pl-2 text-right text-lg font-bold tabular-nums">
                    {l.taxa === null ? "–" : `${l.taxa}%`}
                  </td>
                </tr>
              ))}
              <tr className="bg-gray-50 text-gray-600">
                <th scope="row" className="px-4 py-3 font-normal">{semAbordagem.rotulo}</th>
                <td className="px-2 py-3 text-right tabular-nums">{semAbordagem.total}</td>
                <td className="px-2 py-3 text-right tabular-nums">{semAbordagem.resp}</td>
                <td className="py-3 pr-4 pl-2 text-right tabular-nums">
                  {semAbordagem.taxa === null ? "–" : `${semAbordagem.taxa}%`}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="text-sm text-gray-500">
          Conta pousadas (clientes), não orçamentos. Abordada: tem orçamento enviado. Respondeu: tem
          orçamento agora em Respondido ou Fechado; quem respondeu e depois virou Perdido não entra.
          {poucosDados && ` Com menos de ${POUCOS_DADOS} pousadas numa abordagem, a diferença ainda pode ser sorte.`}
        </p>
      </section>
    </div>
  );
}

function Numero({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div className={`${estiloCartao} px-3 py-4`}>
      <p className="text-3xl font-bold tabular-nums">{valor}</p>
      <p className="mt-1 text-sm leading-tight text-gray-600">{rotulo}</p>
    </div>
  );
}
