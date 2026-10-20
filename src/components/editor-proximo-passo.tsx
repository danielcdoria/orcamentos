"use client";

// Formulário do próximo passo de uma negociação: etapa, o que fazer, quando e com quem está.
// Usado nos cartões da tela "Hoje" e na tela do orçamento. Botões grandes (dedo, não mouse).

import { useState, useTransition, type FormEvent } from "react";
import type { EtapaVenda, VezDe } from "@/generated/prisma/enums";
import { salvarProximoPasso } from "@/app/(app)/hoje/actions";
import { ETAPAS, LISTA_ETAPAS, LISTA_VEZ, MAX_PROXIMO_PASSO, VEZ } from "@/lib/etapas";
import { somarDias, textoDia } from "@/lib/dia";
import { estiloBotao, estiloBotaoSecundario, estiloCampo, estiloErro, estiloRotulo } from "@/components/estilos";

export type ValoresProximoPasso = {
  etapa: EtapaVenda | null;
  proximoPasso: string | null;
  dia: string | null;
  vezDe: VezDe;
};

const ATALHOS = [
  { rotulo: "Hoje", dias: 0 },
  { rotulo: "Amanhã", dias: 1 },
  { rotulo: "Em 3 dias", dias: 3 },
  { rotulo: "Em 1 semana", dias: 7 },
];

const estiloOpcao = (ativo: boolean) =>
  `min-h-11 rounded-full px-4 text-[15px] font-medium ${
    ativo ? "bg-gray-900 text-white" : "bg-white text-gray-800 ring-1 ring-gray-300 hover:bg-gray-50"
  }`;

export function EditorProximoPasso({
  orcamentoId,
  inicial,
  hoje,
  aoSalvar,
  aoCancelar,
}: {
  orcamentoId: string;
  inicial: ValoresProximoPasso;
  hoje: string; // "2026-10-20", vindo do servidor
  aoSalvar?: () => void;
  aoCancelar?: () => void;
}) {
  const [etapa, setEtapa] = useState<EtapaVenda | null>(inicial.etapa);
  const [passo, setPasso] = useState(inicial.proximoPasso ?? "");
  const [dia, setDia] = useState(inicial.dia ?? "");
  const [vez, setVez] = useState<VezDe>(inicial.vezDe);
  const [erro, setErro] = useState<string | null>(null);
  const [salvo, setSalvo] = useState(false);
  const [salvando, iniciar] = useTransition();

  function salvar(e: FormEvent) {
    e.preventDefault();
    setErro(null);
    setSalvo(false);
    iniciar(async () => {
      const problema = await salvarProximoPasso(orcamentoId, { etapa, proximoPasso: passo, dia, vezDe: vez });
      if (problema) {
        setErro(problema);
        return;
      }
      setSalvo(true);
      aoSalvar?.();
    });
  }

  return (
    <form onSubmit={salvar} className="flex flex-col gap-5" aria-label="Próximo passo">
      <fieldset className="flex flex-col gap-2">
        <legend className={estiloRotulo}>Etapa</legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {LISTA_ETAPAS.map((e) => (
            <button key={e} type="button" aria-pressed={etapa === e} onClick={() => setEtapa(e)} className={estiloOpcao(etapa === e)}>
              {ETAPAS[e].rotulo}
            </button>
          ))}
        </div>
      </fieldset>

      <label className="flex flex-col gap-2">
        <span className={estiloRotulo}>Próximo passo</span>
        <input
          name="proximoPasso"
          value={passo}
          onChange={(e) => setPasso(e.target.value)}
          maxLength={MAX_PROXIMO_PASSO}
          placeholder="Ex.: Mandar o site com os ajustes"
          className={estiloCampo}
        />
      </label>

      <fieldset className="flex flex-col gap-2">
        <legend className={estiloRotulo}>Quando</legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {ATALHOS.map((a) => {
            const alvo = somarDias(hoje, a.dias);
            return (
              <button key={a.rotulo} type="button" aria-pressed={dia === alvo} onClick={() => setDia(alvo)} className={estiloOpcao(dia === alvo)}>
                {a.rotulo}
              </button>
            );
          })}
        </div>
        <div className="flex items-center gap-3">
          <input
            type="date"
            name="dia"
            value={dia}
            onChange={(e) => setDia(e.target.value)}
            aria-label="Escolher outra data"
            className={`${estiloCampo} max-w-52`}
          />
          {dia && <span className="text-base text-gray-600">{textoDia(dia, hoje)}</span>}
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-2">
        <legend className={estiloRotulo}>Com quem está</legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {LISTA_VEZ.map((v) => (
            <button key={v} type="button" aria-pressed={vez === v} onClick={() => setVez(v)} className={estiloOpcao(vez === v)}>
              {VEZ[v]}
            </button>
          ))}
        </div>
        <p className="text-sm text-gray-600">
          {vez === "eu" ? "Você precisa fazer algo (site, ajuste, proposta)." : "Você está esperando o cliente. Na data, é hora de chamar."}
        </p>
      </fieldset>

      {erro && <p className={estiloErro}>{erro}</p>}

      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={salvando} className={`${estiloBotao} flex-1`}>
          {salvando ? "Salvando..." : "Salvar próximo passo"}
        </button>
        {aoCancelar && (
          <button type="button" onClick={aoCancelar} className={estiloBotaoSecundario}>
            Cancelar
          </button>
        )}
        {salvo && !salvando && !aoSalvar && <span className="text-sm text-green-700">Salvo ✓</span>}
      </div>
    </form>
  );
}
