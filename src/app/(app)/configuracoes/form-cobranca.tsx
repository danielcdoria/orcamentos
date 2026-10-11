"use client";

import { useActionState, useState } from "react";
import { salvarCobranca, type EstadoForm } from "./actions";
import { estiloBotao, estiloCampo, estiloErro, estiloRotulo } from "@/components/estilos";

// Só os dois prazos da cobrança única. prazoCobranca2 e os 4 modelos de mensagem continuam no
// banco, mas não aparecem mais: a pessoa escreve a cobrança no WhatsApp e marca "Já cobrei".
type Cobranca = {
  prazoCobranca1: string;
  prazoPerdido: string;
  retomarLigado: string; // "sim" ou "" (desligado)
  diasRetomar: string;
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
  // Desligado: o campo de dias fica apagado (e não é obrigatório)
  const [retomarLigado, setRetomarLigado] = useState(v.retomarLigado === "sim");

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

      {/* Retomar conversa: Respondido parado há X dias volta para "Cobrar hoje" */}
      <div className="flex flex-col gap-3 border-t border-gray-200 pt-5">
        <label className="flex min-h-11 items-center gap-3">
          <input
            type="checkbox"
            name="retomarLigado"
            value="sim"
            // defaultChecked (e não checked): depois de salvar, o React limpa o formulário e a caixa
            // volta para o valor que veio do servidor, que é o que acabou de ser salvo
            defaultChecked={v.retomarLigado === "sim"}
            onChange={(e) => setRetomarLigado(e.target.checked)}
            className="size-6 accent-gray-900"
          />
          <span className={estiloRotulo}>Lembrar de retomar quem respondeu e parou de falar</span>
        </label>
        <label className={`flex flex-col gap-2 ${retomarLigado ? "" : "opacity-50"}`}>
          <span className="text-base text-gray-800">Retomar quem respondeu depois de</span>
          <div className="flex items-center gap-2">
            <input
              name="diasRetomar"
              type="number"
              inputMode="numeric"
              min={1}
              max={90}
              required={retomarLigado}
              disabled={!retomarLigado}
              defaultValue={v.diasRetomar}
              className={`${estiloCampo} max-w-20 text-center`}
            />
            <span className="text-base text-gray-600">dias</span>
          </div>
        </label>
        <p className="text-sm text-gray-600">
          Aparece em “Cobrar hoje”, na parte “Retomar conversa”. Depois de “Já retomei”, volta a
          aparecer se passarem mais esses dias sem novidade. Nada vira Perdido sozinho por aqui.
        </p>
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
