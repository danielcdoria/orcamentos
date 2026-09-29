// Bloco discreto com custo total, lucro e margem. INTERNO: só em telas com login.
// Sem "use client": funciona tanto na tela de montar (navegador) quanto na tela do orçamento.
import { formatarCentavos } from "@/lib/dinheiro";
import { faixaMargem, type ResumoMargem } from "@/lib/margem";

const COR = {
  boa: "bg-green-50 text-green-800",
  atencao: "bg-amber-100 text-amber-900",
  baixa: "bg-red-50 text-red-800",
};

export function BlocoMargem({ resumo }: { resumo: ResumoMargem }) {
  if (!resumo.temCusto) return null;
  const faixa = faixaMargem(resumo.margem);
  const margemTexto = `${resumo.margem.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;

  return (
    <section aria-label="Custo e margem (só você vê)" className="rounded-xl border border-dashed border-gray-300 px-4 py-3">
      <p className="text-sm text-gray-500">Só você vê · o cliente não recebe estes números</p>
      <dl className="mt-2 grid grid-cols-3 gap-2 text-base">
        <div>
          <dt className="text-sm text-gray-600">Custo</dt>
          <dd className="font-semibold tabular-nums">{formatarCentavos(resumo.custoTotal)}</dd>
        </div>
        <div>
          <dt className="text-sm text-gray-600">Lucro</dt>
          <dd className="font-semibold tabular-nums">{formatarCentavos(resumo.lucro)}</dd>
        </div>
        <div>
          <dt className="text-sm text-gray-600">Margem</dt>
          <dd>
            <span className={`inline-block rounded-full px-2 py-0.5 font-bold tabular-nums ${COR[faixa]}`}>
              {margemTexto}
            </span>
          </dd>
        </div>
      </dl>
      {resumo.itensSemCusto > 0 && (
        <p className="mt-2 text-sm text-gray-600">
          {resumo.itensSemCusto === 1
            ? "1 item sem custo informado (conta como custo zero)."
            : `${resumo.itensSemCusto} itens sem custo informado (contam como custo zero).`}
        </p>
      )}
    </section>
  );
}
