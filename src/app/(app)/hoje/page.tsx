import Link from "next/link";
import { BellRing, CircleCheck } from "lucide-react";
import { exigirSessao } from "@/lib/auth";
import { agruparHoje, buscarNegociacoes, type Negociacao } from "@/lib/negociacao";
import { contarPendencias } from "@/lib/retomar";
import { hojeNoFuso } from "@/lib/dia";
import { EstadoVazio } from "@/components/estado-vazio";
import { estiloCartao, estiloTitulo } from "@/components/estilos";
import { CartaoNegociacao } from "./cartao-negociacao";
import { AbasNegociacao } from "./abas";

// HOJE: tudo o que está em negociação (clientes que responderam), organizado por data.
// Cada negociação tem um próximo passo com dia e "com quem está"; assim nenhuma conversa
// some. As regras ficam em src/lib/negociacao.ts. O sistema não manda mensagem sozinho.
export default async function Hoje() {
  const { empresaId } = await exigirSessao();
  const [lista, paraCobrar] = await Promise.all([buscarNegociacoes(empresaId), contarPendencias(empresaId)]);
  const g = agruparHoje(lista);
  const hoje = hojeNoFuso();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <h1 className={estiloTitulo}>Hoje</h1>
          <Link href="/importar" className="text-base font-semibold text-marca underline-offset-2 hover:underline">
          Importar lote
        </Link>
        </div>
        <AbasNegociacao ativa="hoje" />
      </div>

      {paraCobrar > 0 && (
        <Link href="/cobrar" className={`${estiloCartao} flex items-center gap-3 px-4 py-3 text-base hover:bg-gray-50`}>
          <BellRing className="size-5 shrink-0 text-red-600" aria-hidden />
          <span className="flex-1">
            {paraCobrar === 1 ? "1 orçamento para cobrar ou retomar" : `${paraCobrar} orçamentos para cobrar ou retomar`}
          </span>
          <span className="font-semibold text-marca">Abrir</span>
        </Link>
      )}

      {lista.length === 0 ? (
        <EstadoVazio
          icone={CircleCheck}
          titulo="Nenhuma negociação aberta"
          texto="Quando um cliente responder, mude o orçamento para “Respondido”. Ele aparece aqui, e você define o próximo passo e o dia."
          botao="Ver orçamentos"
          href="/orcamentos"
        />
      ) : (
        <>
          <Secao
            titulo="Para hoje"
            vazio="Nada vence hoje ✓"
            dica="Próximos passos de hoje e os atrasados. Fez? Atualize o próximo passo."
            itens={g.paraHoje}
            hoje={hoje}
            destaque
          />
          <Secao
            titulo="Sem próximo passo"
            dica="Responderam, mas ainda não tem o que fazer nem quando. Defina para não esquecer."
            itens={g.semPasso}
            hoje={hoje}
          />
          <Secao titulo="Você deve" dica="Está com você: site, ajuste, proposta." itens={g.euDevo} hoje={hoje} />
          <Secao titulo="Esperando o cliente" dica="No dia marcado, aparece em “Para hoje”." itens={g.esperando} hoje={hoje} />
        </>
      )}
    </div>
  );
}

function Secao({
  titulo,
  dica,
  vazio,
  itens,
  hoje,
  destaque,
}: {
  titulo: string;
  dica: string;
  vazio?: string;
  itens: Negociacao[];
  hoje: string;
  destaque?: boolean;
}) {
  if (itens.length === 0 && !vazio) return null;
  return (
    <section className="flex flex-col gap-3" aria-label={titulo}>
      <div>
        <h2 className={`font-semibold ${destaque ? "text-xl" : "text-lg"}`}>
          {titulo} <span className="font-normal text-gray-500">({itens.length})</span>
        </h2>
        <p className="text-sm text-gray-600">{dica}</p>
      </div>
      {itens.length === 0 ? (
        <p className="rounded-2xl bg-green-50 px-4 py-3 text-base text-green-800">{vazio}</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {itens.map((n) => (
            <CartaoNegociacao key={n.orcamentoId} n={n} hoje={hoje} />
          ))}
        </ul>
      )}
    </section>
  );
}
