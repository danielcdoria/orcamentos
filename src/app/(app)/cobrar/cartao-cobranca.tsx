"use client";

// Um cartão por cliente em "Cobrar hoje": quem cobrar, há quanto tempo e em qual etapa.
// A mensagem é escrita pela pessoa no WhatsApp; aqui ela só marca "Já cobrei".

import Link from "next/link";
import { useEffect, useState } from "react";
import { CheckCheck, Shuffle } from "lucide-react";
import { formatarCentavos } from "@/lib/dinheiro";
import { formatarTelefone } from "@/lib/telefone";
import type { ItemFila } from "@/lib/cobranca";
import { estiloBotao, estiloBotaoSecundario, estiloCartao } from "@/components/estilos";

const SEGUNDOS_DESFAZER = 8;

function textoDias(dias: number) {
  return dias === 1 ? "há 1 dia" : `há ${dias} dias`;
}

export function CartaoCobranca({
  item,
  aoCobrar,
  aoResponder,
}: {
  item: ItemFila;
  aoCobrar: () => void;
  aoResponder: () => void;
}) {
  return (
    <li className={`${estiloCartao} flex flex-col gap-4 p-4`}>
      {/* Quem, quanto e há quanto tempo */}
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xl font-bold break-words">{item.cliente}</p>
          {item.telefone && <p className="mt-1 text-base text-gray-700">{formatarTelefone(item.telefone)}</p>}
          <p className="mt-1 text-base text-gray-600">
            Enviado {textoDias(item.dias)} ·{" "}
            <Link href={`/orcamentos/${item.orcamentoId}`} className="underline underline-offset-2">
              nº {item.numero}
            </Link>
          </p>
        </div>
        <p className="shrink-0 text-xl font-bold text-marca">{formatarCentavos(item.total)}</p>
      </div>

      <div className="flex flex-wrap gap-2 text-sm font-medium">
        <span className="rounded-full bg-amber-100 px-3 py-1 text-amber-900">{item.etapa}ª cobrança</span>
        {item.mexeuNasOpcoes && (
          <span className="flex items-center gap-1 rounded-full bg-amber-100 px-3 py-1 text-amber-900">
            <Shuffle className="size-4" aria-hidden />
            Mexeu nas opções
          </span>
        )}
      </div>

      {/* Sinal de dúvida de preço: o cliente trocou opções e não respondeu */}
      {item.mexeuNasOpcoes && (
        <p className="rounded-xl bg-amber-50 px-3 py-2 text-base text-amber-950">
          Mexeu nas opções {item.mexeuNasOpcoes.vezes === 1 ? "1 vez" : `${item.mexeuNasOpcoes.vezes} vezes`}
          {item.mexeuNasOpcoes.dias === 0 ? " (hoje)" : ` (a última ${textoDias(item.mexeuNasOpcoes.dias)})`} e não
          respondeu: pode ser dúvida de preço. Escolha atual: {item.mexeuNasOpcoes.resumo}.
        </p>
      )}

      <button type="button" onClick={aoCobrar} className={`${estiloBotao} w-full text-lg`}>
        <CheckCheck className="size-5" aria-hidden />
        Já cobrei
      </button>
      <button type="button" onClick={aoResponder} className={`${estiloBotaoSecundario} w-full`}>
        O cliente já respondeu
      </button>
    </li>
  );
}

// A linha verde depois de "Já cobrei" / "O cliente já respondeu". Depois do "Já cobrei", mostra
// "Desfazer" por alguns segundos (para quando se toca na pousada errada).
export function LinhaConcluida({
  item,
  tipo,
  aoDesfazer,
}: {
  item: ItemFila;
  tipo: "cobrado" | "respondido";
  aoDesfazer?: () => void; // só existe depois que o servidor confirmou a cobrança
}) {
  const [podeDesfazer, setPodeDesfazer] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setPodeDesfazer(false), SEGUNDOS_DESFAZER * 1000);
    return () => clearTimeout(t);
  }, []);

  return (
    <li
      role="status"
      className="flex min-h-14 items-center justify-between gap-3 rounded-2xl bg-green-50 px-5 py-3 text-base text-green-800"
    >
      <span>
        {item.cliente}: {tipo === "cobrado" ? "cobrança registrada ✓" : "marcado como respondido ✓"}
      </span>
      {tipo === "cobrado" && podeDesfazer && aoDesfazer && (
        <button
          type="button"
          onClick={aoDesfazer}
          className="min-h-11 shrink-0 rounded-xl px-3 font-semibold text-green-900 underline underline-offset-2 hover:bg-green-100"
        >
          Desfazer
        </button>
      )}
    </li>
  );
}
