"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { marcarRespondido, registrarCobranca } from "./actions";
import { formatarCentavos } from "@/lib/dinheiro";
import { telefoneParaWhatsApp } from "@/lib/telefone";
import type { ItemFila } from "@/lib/cobranca";
import { estiloBotaoSecundario, estiloBotaoWhatsApp, estiloCampo } from "@/components/estilos";

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
      <li className="rounded-xl border border-green-200 bg-green-50 px-5 py-4 text-sm text-green-800">
        {item.cliente}: {concluido === "enviado" ? "cobrança enviada ✓" : "marcado como respondido ✓"}
      </li>
    );
  }

  return (
    <li className="flex flex-col gap-3 rounded-xl border border-gray-200 p-5">
      {/* Quem, quanto e a situação */}
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="truncate text-lg font-semibold">{item.cliente}</p>
          <p className="mt-0.5 text-sm text-gray-600">
            Enviado {textoDias(item.dias)} ·{" "}
            <Link href={`/orcamentos/${item.orcamentoId}`} className="underline">
              nº {item.numero}
            </Link>
          </p>
        </div>
        <p className="shrink-0 text-lg font-bold">{formatarCentavos(item.total)}</p>
      </div>

      <div className="flex flex-wrap gap-2 text-xs font-semibold">
        {item.abriu ? (
          <span className="rounded-full bg-green-700 px-2 py-0.5 text-white">Abriu o link</span>
        ) : (
          <span className="rounded-full border border-gray-300 px-2 py-0.5 text-gray-600">Não abriu</span>
        )}
        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-amber-900">
          {item.etapa}ª cobrança
        </span>
      </div>

      {/* Mensagem pronta, editável */}
      <textarea
        aria-label={`Mensagem para ${item.cliente}`}
        rows={4}
        value={mensagem}
        onChange={(e) => setMensagem(e.target.value)}
        className={`${estiloCampo} text-sm`}
      />

      <div className="grid grid-cols-2 gap-3">
        {/* Link normal (abre o WhatsApp sem ser bloqueado); o onClick registra a cobrança. */}
        <a
          href={urlWhatsApp}
          target="_blank"
          rel="noopener"
          onClick={() => {
            setConcluido("enviado");
            iniciar(() => registrarCobranca(item.orcamentoId, item.etapa, mensagem));
          }}
          className={`${estiloBotaoWhatsApp} flex items-center justify-center`}
        >
          Enviar no WhatsApp
        </a>
        <button
          type="button"
          onClick={() => {
            setConcluido("respondido");
            iniciar(() => marcarRespondido(item.orcamentoId));
          }}
          className={estiloBotaoSecundario}
        >
          Já respondeu
        </button>
      </div>

      {!telefone && (
        <p className="text-xs text-gray-500">
          Cliente sem telefone completo (com DDD): o WhatsApp vai pedir para você escolher o contato.
        </p>
      )}
    </li>
  );
}
