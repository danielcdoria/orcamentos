import { exigirSessao } from "@/lib/auth";
import { buscarNegociacoes, type Negociacao } from "@/lib/negociacao";
import { ETAPAS, LISTA_ETAPAS } from "@/lib/etapas";
import { hojeNoFuso } from "@/lib/dia";
import { estiloTitulo } from "@/components/estilos";
import { CartaoNegociacao } from "../hoje/cartao-negociacao";
import { AbasNegociacao } from "../hoje/abas";

// FUNIL: as mesmas negociações da tela "Hoje", agrupadas por etapa, da mais fria para a
// mais quente, uma etapa embaixo da outra.
export default async function Funil() {
  const { empresaId } = await exigirSessao();
  const lista = await buscarNegociacoes(empresaId);
  const hoje = hojeNoFuso();

  // Dentro de cada etapa: atrasados e de hoje primeiro, depois por data, sem data no fim
  const ordenar = (a: Negociacao, b: Negociacao) => (a.dia ?? "9999").localeCompare(b.dia ?? "9999");
  const colunas: { id: string; rotulo: string; itens: Negociacao[] }[] = [
    { id: "sem", rotulo: "Sem etapa", itens: lista.filter((n) => !n.etapa).sort(ordenar) },
    ...LISTA_ETAPAS.map((e) => ({ id: e, rotulo: ETAPAS[e].rotulo, itens: lista.filter((n) => n.etapa === e).sort(ordenar) })),
  ].filter((c) => c.id !== "sem" || c.itens.length > 0);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <h1 className={estiloTitulo}>Funil</h1>
        <AbasNegociacao ativa="funil" />
        <p className="text-base text-gray-600">
          {lista.length === 1 ? "1 negociação aberta." : `${lista.length} negociações abertas.`} Mudou de etapa? Toque em
          “Atualizar próximo passo”.
        </p>
      </div>

      <div className="flex flex-col gap-8">
        {colunas.map((c) => (
          <section key={c.id} aria-label={c.rotulo} className="flex flex-col gap-3">
            <h2 className="text-lg font-semibold">
              {c.rotulo} <span className="font-normal text-gray-500">({c.itens.length})</span>
            </h2>
            {c.itens.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-gray-300 px-4 py-3 text-sm text-gray-500">Ninguém nesta etapa</p>
            ) : (
              <ul className="flex flex-col gap-3">
                {c.itens.map((n) => (
                  <CartaoNegociacao key={n.orcamentoId} n={n} hoje={hoje} />
                ))}
              </ul>
            )}
          </section>
        ))}
      </div>
    </div>
  );
}
