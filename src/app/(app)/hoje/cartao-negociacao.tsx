"use client";

// Um cartão de negociação na tela "Hoje" (e no Funil): quem é, em que etapa está, qual o
// próximo passo e quando. "Atualizar" abre o formulário ali mesmo; "Fechou" e "Perdeu"
// encerram a negociação.

import Link from "next/link";
import { useState, useTransition } from "react";
import { Pencil } from "lucide-react";
import type { Negociacao } from "@/lib/negociacao";
import { ETAPAS, VEZ } from "@/lib/etapas";
import { textoDia } from "@/lib/dia";
import { ContatoCliente } from "@/components/contato-cliente";
import { EditorProximoPasso } from "@/components/editor-proximo-passo";
import { estiloBotaoSecundario, estiloCartao } from "@/components/estilos";
import { encerrarNegociacao } from "./actions";

function Prazo({ n, hoje }: { n: Negociacao; hoje: string }) {
  if (!n.dia) {
    return (
      <span className="rounded-full bg-gray-100 px-3 py-1 text-sm font-medium text-gray-700">
        Sem próximo passo{n.diasParado > 0 && ` · parado há ${n.diasParado} ${n.diasParado === 1 ? "dia" : "dias"}`}
      </span>
    );
  }
  if (n.atraso > 0) {
    return (
      <span className="rounded-full bg-red-50 px-3 py-1 text-sm font-semibold text-red-800">
        Atrasado {n.atraso === 1 ? "1 dia" : `${n.atraso} dias`}
      </span>
    );
  }
  if (n.atraso === 0) {
    return <span className="rounded-full bg-amber-100 px-3 py-1 text-sm font-semibold text-amber-900">Hoje</span>;
  }
  return <span className="rounded-full bg-gray-100 px-3 py-1 text-sm font-medium text-gray-800">{textoDia(n.dia, hoje)}</span>;
}

export function CartaoNegociacao({ n, hoje }: { n: Negociacao; hoje: string }) {
  const [editando, setEditando] = useState(false);
  const [encerrando, setEncerrando] = useState(false);
  const [encerrado, setEncerrado] = useState<"fechado" | "perdido" | null>(null);
  const [, iniciar] = useTransition();

  if (encerrado) {
    return (
      <li className="rounded-2xl bg-green-50 px-4 py-3 text-base text-green-800">
        {n.cliente}: marcado como {encerrado === "fechado" ? "Fechado ✓" : "Perdido"}
      </li>
    );
  }

  return (
    <li className={`${estiloCartao} flex flex-col gap-3 p-4`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <Link href={`/orcamentos/${n.orcamentoId}`} className="text-lg font-bold break-words underline-offset-2 hover:underline">
            {n.cliente}
          </Link>
          <p className="mt-0.5 text-sm text-gray-600">
            {n.cidade ? `${n.cidade} · ` : ""}nº {n.numero}
          </p>
        </div>
        <ContatoCliente nome={n.cliente} telefone={n.telefone} linkDemo={n.linkDemo} compacto />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {n.etapa && (
          <span className={`rounded-full px-3 py-1 text-sm font-medium ${ETAPAS[n.etapa].estilo}`}>{ETAPAS[n.etapa].rotulo}</span>
        )}
        <Prazo n={n} hoje={hoje} />
        {n.dia && <span className="text-sm text-gray-600">{VEZ[n.vezDe]}</span>}
      </div>

      {n.proximoPasso && <p className="text-base font-medium text-gray-900">{n.proximoPasso}</p>}

      {n.observacaoCliente && (
        <details className="text-sm text-gray-700">
          <summary className="cursor-pointer text-gray-600">Anotações do cliente</summary>
          <p className="mt-1 whitespace-pre-line">{n.observacaoCliente}</p>
        </details>
      )}

      {editando ? (
        <div className="mt-2 border-t border-gray-200 pt-4">
          <EditorProximoPasso
            orcamentoId={n.orcamentoId}
            hoje={hoje}
            inicial={{ etapa: n.etapa, proximoPasso: n.proximoPasso, dia: n.dia, vezDe: n.vezDe }}
            aoSalvar={() => setEditando(false)}
            aoCancelar={() => setEditando(false)}
          />
        </div>
      ) : encerrando ? (
        <div role="group" aria-label="Encerrar negociação" className="grid grid-cols-3 gap-2">
          {(["fechado", "perdido"] as const).map((s) => (
            <button
              key={s}
              type="button"
              className={estiloBotaoSecundario}
              onClick={() =>
                iniciar(async () => {
                  setEncerrado(s);
                  await encerrarNegociacao(n.orcamentoId, s);
                })
              }
            >
              {s === "fechado" ? "Fechou ✓" : "Perdeu"}
            </button>
          ))}
          <button type="button" onClick={() => setEncerrando(false)} className={estiloBotaoSecundario}>
            Voltar
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-[1fr_auto] gap-2">
          <button type="button" onClick={() => setEditando(true)} className={estiloBotaoSecundario}>
            <Pencil className="size-4" aria-hidden />
            {n.dia ? "Atualizar próximo passo" : "Definir próximo passo"}
          </button>
          <button type="button" onClick={() => setEncerrando(true)} className={estiloBotaoSecundario}>
            Encerrar
          </button>
        </div>
      )}
    </li>
  );
}
