import { exigirSessao } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatarCentavos } from "@/lib/dinheiro";
import { marcarPerdidosVencidos } from "@/lib/cobranca";
import { mesAtual } from "@/lib/mes";
import { STATUS_AGUARDANDO } from "@/lib/status";

// PAINEL: quatro números, nada além disso.
// O mais importante é o "valor parado": é o dinheiro que está na mesa esperando resposta,
// e é o que a tela "Cobrar hoje" ajuda a recuperar.
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
  const [enviados, fechados, parado] = await Promise.all([
    prisma.orcamento.count({ where: doMes }),
    // Fechados ENTRE os enviados neste mês (assim a taxa fica sempre entre 0% e 100%)
    prisma.orcamento.count({ where: { ...doMes, status: "fechado" } }),
    // Parado = tudo que está esperando resposta agora, de qualquer mês
    prisma.orcamento.aggregate({
      where: { empresaId, status: { in: STATUS_AGUARDANDO } },
      _sum: { total: true },
      _count: true,
    }),
  ]);

  const taxa = enviados > 0 ? Math.round((fechados / enviados) * 100) : 0;
  const valorParado = parado._sum.total ?? 0;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold">Painel</h1>
        <p className="mt-1 text-gray-600 first-letter:uppercase">{nome}</p>
      </div>

      {/* O número que vende o produto */}
      <section className="rounded-2xl bg-gray-900 px-6 py-8 text-white">
        <p className="text-sm font-medium text-gray-300">Parado esperando resposta</p>
        <p className="mt-2 text-4xl font-bold tracking-tight tabular-nums sm:text-5xl">
          {formatarCentavos(valorParado)}
        </p>
        <p className="mt-3 text-sm text-gray-300">
          {parado._count === 1
            ? "em 1 orçamento enviado que ainda não teve resposta"
            : `em ${parado._count} orçamentos enviados que ainda não tiveram resposta`}
        </p>
      </section>

      <section className="grid grid-cols-3 gap-3">
        <Numero rotulo="Enviados" valor={String(enviados)} />
        <Numero rotulo="Fechados" valor={String(fechados)} />
        <Numero rotulo="Taxa de fechamento" valor={`${taxa}%`} />
      </section>

      <p className="text-xs text-gray-500">
        Enviados, fechados e taxa contam os orçamentos enviados neste mês. O valor parado soma todos
        os orçamentos com status Enviado ou Aberto.
      </p>
    </div>
  );
}

function Numero({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div className="rounded-xl border border-gray-200 px-4 py-4">
      <p className="text-3xl font-bold tabular-nums">{valor}</p>
      <p className="mt-1 text-xs leading-tight text-gray-600">{rotulo}</p>
    </div>
  );
}
