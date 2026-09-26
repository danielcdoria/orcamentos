"use client";

import { useActionState } from "react";
import { salvarCobranca, type EstadoForm } from "./actions";
import { VARIAVEIS_MENSAGEM } from "@/lib/mensagem";
import { estiloBotao, estiloCampo, estiloErro, estiloRotulo } from "@/components/estilos";

type Cobranca = {
  prazoCobranca1: string;
  prazoCobranca2: string;
  prazoPerdido: string;
  msgCobranca1NaoAbriu: string;
  msgCobranca1Abriu: string;
  msgCobranca2NaoAbriu: string;
  msgCobranca2Abriu: string;
};

function CampoDias({ nome, rotulo, valor }: { nome: string; rotulo: string; valor: string }) {
  return (
    <label className="flex flex-col gap-1">
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
          className={`${estiloCampo} w-20`}
        />
        <span className="text-sm text-gray-600">dias</span>
      </div>
    </label>
  );
}

function CampoMensagem({ nome, rotulo, dica, valor }: { nome: string; rotulo: string; dica: string; valor: string }) {
  return (
    <label className="flex flex-col gap-1">
      <span className={estiloRotulo}>{rotulo}</span>
      <span className="text-xs text-gray-500">{dica}</span>
      <textarea name={nome} rows={5} maxLength={1000} required defaultValue={valor} className={estiloCampo} />
    </label>
  );
}

export function FormCobranca({ cobranca }: { cobranca: Cobranca }) {
  const [estado, acao, enviando] = useActionState<EstadoForm, FormData>(salvarCobranca, {});
  const v = (estado.valores as Cobranca | undefined) ?? cobranca;

  return (
    <form action={acao} className="flex flex-col gap-5">
      <p className="text-sm text-gray-600">
        Os dias contam a partir do envio do orçamento, enquanto o cliente não responde. Quando você
        marca um orçamento como Respondido, Fechado ou Perdido, ele sai da cobrança.
      </p>

      <div className="grid grid-cols-3 gap-3">
        <CampoDias nome="prazoCobranca1" rotulo="1ª cobrança" valor={v.prazoCobranca1} />
        <CampoDias nome="prazoCobranca2" rotulo="2ª cobrança" valor={v.prazoCobranca2} />
        <CampoDias nome="prazoPerdido" rotulo="Dar como perdido" valor={v.prazoPerdido} />
      </div>

      <p className="text-xs text-gray-500">
        Nas mensagens, estas palavras são trocadas na hora:{" "}
        {Object.entries(VARIAVEIS_MENSAGEM).map(([chave, descricao], i) => (
          <span key={chave}>
            {i > 0 && ", "}
            <code className="rounded bg-gray-100 px-1">{`{${chave}}`}</code> = {descricao}
          </span>
        ))}
        .
      </p>

      <CampoMensagem
        nome="msgCobranca1NaoAbriu"
        rotulo="1ª cobrança · cliente NÃO abriu o link"
        dica="Talvez nem tenha visto a mensagem. Vale mandar o link de novo."
        valor={v.msgCobranca1NaoAbriu}
      />
      <CampoMensagem
        nome="msgCobranca1Abriu"
        rotulo="1ª cobrança · cliente ABRIU o link"
        dica="Viu e não respondeu: provavelmente ficou com alguma dúvida."
        valor={v.msgCobranca1Abriu}
      />
      <CampoMensagem
        nome="msgCobranca2NaoAbriu"
        rotulo="2ª cobrança · cliente NÃO abriu o link"
        dica="Segunda tentativa de fazer o orçamento chegar."
        valor={v.msgCobranca2NaoAbriu}
      />
      <CampoMensagem
        nome="msgCobranca2Abriu"
        rotulo="2ª cobrança · cliente ABRIU o link"
        dica="Está em dúvida ou achou caro: abra espaço para negociar."
        valor={v.msgCobranca2Abriu}
      />

      {estado.erro && <p role="alert" className={estiloErro}>{estado.erro}</p>}
      {estado.ok && (
        <p role="status" className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-800">
          Cobrança salva.
        </p>
      )}

      <button type="submit" disabled={enviando} className={estiloBotao}>
        {enviando ? "Salvando..." : "Salvar cobrança"}
      </button>
    </form>
  );
}
