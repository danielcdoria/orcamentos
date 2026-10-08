"use client";

import { useActionState } from "react";
import { salvarCobranca, type EstadoForm } from "./actions";
import { estiloBotao, estiloCampo, estiloErro, estiloRotulo } from "@/components/estilos";

// Só os prazos. Os 4 modelos de mensagem de cobrança (msgCobranca*) continuam no banco, mas
// não aparecem mais: a pessoa escreve cada cobrança no WhatsApp e só marca "Já cobrei".
type Cobranca = {
  prazoCobranca1: string;
  prazoCobranca2: string;
  prazoPerdido: string;
};

function CampoDias({ nome, rotulo, valor }: { nome: string; rotulo: string; valor: string }) {
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
    </label>
  );
}

export function FormCobranca({ cobranca }: { cobranca: Cobranca }) {
  const [estado, acao, enviando] = useActionState<EstadoForm, FormData>(salvarCobranca, {});
  const v = (estado.valores as Cobranca | undefined) ?? cobranca;

  return (
    <form action={acao} className="flex flex-col gap-5">
      <p className="text-base text-gray-600">
        Quantos dias depois de enviar o orçamento, sem resposta, o sistema te lembra de cobrar. Em
        “Desistir”, o orçamento vira Perdido e sai da lista. Se o cliente responder antes, marque
        Respondido, Fechado ou Perdido e ele também sai da lista.
      </p>

      <div className="grid grid-cols-3 gap-3">
        {/* "Desistir" = marca como perdido e para de cobrar */}
        <CampoDias nome="prazoCobranca1" rotulo="1ª cobrança" valor={v.prazoCobranca1} />
        <CampoDias nome="prazoCobranca2" rotulo="2ª cobrança" valor={v.prazoCobranca2} />
        <CampoDias nome="prazoPerdido" rotulo="Desistir" valor={v.prazoPerdido} />
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
