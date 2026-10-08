"use client";

import { useActionState } from "react";
import { salvarCobranca, type EstadoForm } from "./actions";
import { estiloBotao, estiloCampo, estiloErro, estiloRotulo } from "@/components/estilos";

// Só os dois prazos da cobrança única. prazoCobranca2 e os 4 modelos de mensagem continuam no
// banco, mas não aparecem mais: a pessoa escreve a cobrança no WhatsApp e marca "Já cobrei".
type Cobranca = {
  prazoCobranca1: string;
  prazoPerdido: string;
};

function CampoDias({ nome, rotulo, dica, valor }: { nome: string; rotulo: string; dica: string; valor: string }) {
  return (
    <label className="flex flex-col gap-2">
      <span className={estiloRotulo}>{rotulo}</span>
      <div className="flex items-center gap-2">
        <input
          name={nome}
          type="number"
          inputMode="numeric"
          min={1}
          max={90}
          required
          defaultValue={valor}
          className={`${estiloCampo} w-20 text-center`}
        />
        <span className="text-base text-gray-600">dias</span>
      </div>
      <span className="text-sm text-gray-600">{dica}</span>
    </label>
  );
}

export function FormCobranca({ cobranca }: { cobranca: Cobranca }) {
  const [estado, acao, enviando] = useActionState<EstadoForm, FormData>(salvarCobranca, {});
  const v = (estado.valores as Cobranca | undefined) ?? cobranca;

  return (
    <form action={acao} className="flex flex-col gap-5">
      <p className="text-base text-gray-600">
        Você cobra uma vez só. Se o cliente responder, marque Respondido, Fechado ou Perdido e ele
        sai da lista.
      </p>

      <div className="grid grid-cols-2 gap-3">
        <CampoDias
          nome="prazoCobranca1"
          rotulo="Cobrar"
          dica="depois de enviar o orçamento, sem resposta"
          valor={v.prazoCobranca1}
        />
        <CampoDias
          nome="prazoPerdido"
          rotulo="Virar Perdido"
          dica="depois da cobrança, sem resposta"
          valor={v.prazoPerdido}
        />
      </div>

      {estado.erro && <p role="alert" className={estiloErro}>{estado.erro}</p>}
      {estado.ok && (
        <p role="status" className="rounded-xl bg-green-50 px-4 py-3 text-base text-green-800">
          Cobrança salva.
        </p>
      )}

      <button type="submit" disabled={enviando} className={`${estiloBotao} w-full text-lg`}>
        {enviando ? "Salvando..." : "Salvar cobrança"}
      </button>
    </form>
  );
}
