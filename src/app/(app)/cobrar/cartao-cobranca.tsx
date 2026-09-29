"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { MessageCircle, Shuffle } from "lucide-react";
import { marcarRespondido, registrarCobranca } from "./actions";
import { formatarCentavos } from "@/lib/dinheiro";
import { telefoneParaWhatsApp } from "@/lib/telefone";
import type { ItemFila } from "@/lib/cobranca";
import { estiloBotao, estiloBotaoSecundario, estiloCampo, estiloCartao } from "@/components/estilos";

function textoDias(dias: number) {
  return dias === 1 ? "há 1 dia" : `há ${dias} dias`;
}

export function CartaoCobranca({ item }: { item: ItemFila }) {
  // A mensagem pode ser ajustada antes de enviar (só para este cliente; o modelo não muda).
  const [mensagem, setMensagem] = useState(item.mensagem);
  const [concluido, setConcluido] = useState<"enviado" | "respondido" | null>(null);
  const [, iniciar] = useTransition();

  const telefone = telefoneParaWhatsApp(item.telefone);
  const urlWhatsApp = `https://wa.me/${telefone ?? ""}?text=${encodeURIComponent(mensagem)}`;

  if (concluido) {
    return (
      <li className="rounded-2xl bg-green-50 px-5 py-4 text-base text-green-800">
        {item.cliente}: {concluido === "enviado" ? "cobrança enviada ✓" : "marcado como respondido ✓"}
      </li>
    );
  }

  return (
    <li className={`${estiloCartao} flex flex-col gap-4 p-4`}>
      {/* Quem, quanto e a situação */}
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="truncate text-xl font-bold">{item.cliente}</p>
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
        {item.abriu ? (
          <span className="rounded-full bg-green-50 px-3 py-1 text-green-800">Viu o orçamento</span>
        ) : (
          <span className="rounded-full px-3 py-1 text-gray-700 ring-1 ring-gray-300">Ainda não viu</span>
        )}
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

      {/* Mensagem pronta, editável */}
      <label className="flex flex-col gap-2">
        <span className="text-base text-gray-700">Mensagem (pode mudar antes de enviar):</span>
        <textarea
          rows={5}
          value={mensagem}
          onChange={(e) => setMensagem(e.target.value)}
          className={estiloCampo}
        />
      </label>

      {/* Link normal (abre o WhatsApp sem ser bloqueado); o onClick registra a cobrança. */}
      <a
        href={urlWhatsApp}
        target="_blank"
        rel="noopener"
        onClick={() => {
          setConcluido("enviado");
          iniciar(() => registrarCobranca(item.orcamentoId, item.etapa, mensagem));
        }}
        className={`${estiloBotao} w-full text-lg`}
      >
        <MessageCircle className="size-5" aria-hidden />
        Enviar no WhatsApp
      </a>
      <button
        type="button"
        onClick={() => {
          setConcluido("respondido");
          iniciar(() => marcarRespondido(item.orcamentoId));
        }}
        className={`${estiloBotaoSecundario} w-full`}
      >
        O cliente já respondeu
      </button>

      {!telefone && (
        <p className="text-base text-gray-600">
          Este cliente está sem telefone completo (com DDD). O WhatsApp vai pedir para você escolher o
          contato.
        </p>
      )}
    </li>
  );
}
