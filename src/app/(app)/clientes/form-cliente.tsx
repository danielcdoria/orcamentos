"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { salvarCliente, type EstadoForm } from "./actions";
import { estiloBotao, estiloBotaoSecundario, estiloCampo, estiloDica, estiloErro, estiloRotulo } from "@/components/estilos";
import { ABORDAGEM, LISTA_ABORDAGEM, formatarNota } from "@/lib/prospeccao";
import type { Abordagem } from "@/generated/prisma/enums";

type Cliente = {
  id: string;
  nome: string;
  telefone: string | null;
  observacao: string | null;
  cidade: string | null;
  abordagem: Abordagem | null;
  linkDemo: string | null;
  instagram: string | null;
  notaGoogle: number | null;
  avaliacoesGoogle: number | null;
};

// O mesmo formulário serve para criar (sem cliente) e editar (com cliente).
export function FormCliente({
  cliente,
  voltar,
  nomeInicial,
}: {
  cliente?: Cliente;
  voltar?: string;
  nomeInicial?: string; // cadastro vindo de uma busca sem resultado: já vem com o nome digitado
}) {
  // bind "prende" o id e o "voltar" como primeiros argumentos da ação
  const acaoComId = salvarCliente.bind(null, cliente?.id ?? null, voltar ?? null);
  const [estado, acao, enviando] = useActionState<EstadoForm, FormData>(acaoComId, {});
  // Depois de um erro, mostra o que foi digitado; senão, os dados do cliente (ou vazio).
  const v = estado.valores ?? {
    nome: cliente?.nome ?? nomeInicial ?? "",
    telefone: cliente?.telefone ?? "",
    observacao: cliente?.observacao ?? "",
    cidade: cliente?.cidade ?? "",
    linkDemo: cliente?.linkDemo ?? "",
    instagram: cliente?.instagram ?? "",
    notaGoogle: cliente?.notaGoogle != null ? formatarNota(cliente.notaGoogle) : "",
    avaliacoesGoogle: cliente?.avaliacoesGoogle != null ? String(cliente.avaliacoesGoogle) : "",
  };
  // Abordagem fica aqui (não no formulário), então não se perde se o salvar der erro.
  const [abordagem, setAbordagem] = useState<Abordagem | null>(cliente?.abordagem ?? null);
  const cancelar = voltar === "orcamento" ? "/orcamentos/novo" : "/clientes";

  return (
    <form action={acao} className="flex flex-col gap-5">
      <label className="flex flex-col gap-2">
        <span className={estiloRotulo}>Nome</span>
        <input name="nome" required maxLength={120} autoComplete="off" defaultValue={v.nome} className={estiloCampo} />
      </label>

      <label className="flex flex-col gap-2">
        <span className={estiloRotulo}>WhatsApp / telefone</span>
        <input
          name="telefone"
          type="tel"
          inputMode="tel"
          placeholder="(21) 99999-9999"
          defaultValue={v.telefone}
          className={estiloCampo}
        />
        <span className="text-sm text-gray-600">Com DDD, para o orçamento ir direto para a conversa dele.</span>
      </label>

      <fieldset className="flex flex-col gap-5 border-t border-gray-200 pt-5">
        <legend className="float-left mb-1 text-lg font-semibold text-gray-900">
          Prospecção <span className="text-base font-normal text-gray-500">(tudo opcional)</span>
        </legend>

        <label className="clear-left flex flex-col gap-2">
          <span className={estiloRotulo}>Cidade</span>
          <input name="cidade" maxLength={80} placeholder="Ex.: Lumiar" defaultValue={v.cidade} className={estiloCampo} />
        </label>

        <div className="flex flex-col gap-2">
          <span id="rotulo-abordagem" className={estiloRotulo}>
            Abordagem
          </span>
          <input type="hidden" name="abordagem" value={abordagem ?? ""} />
          <div role="group" aria-labelledby="rotulo-abordagem" className="grid grid-cols-2 gap-2">
            {LISTA_ABORDAGEM.map((a) => (
              <button
                key={a}
                type="button"
                aria-pressed={abordagem === a}
                // Tocar de novo na escolhida desmarca (a abordagem é opcional)
                onClick={() => setAbordagem(abordagem === a ? null : a)}
                className={`flex min-h-12 items-center justify-center rounded-xl border px-3 py-3 text-center text-base font-medium ${
                  abordagem === a
                    ? "border-gray-900 bg-gray-900 text-white"
                    : "border-gray-300 bg-white text-gray-900 hover:bg-gray-50"
                }`}
              >
                {ABORDAGEM[a]}
              </button>
            ))}
          </div>
        </div>

        <label className="flex flex-col gap-2">
          <span className={estiloRotulo}>Link da demonstração</span>
          <input
            name="linkDemo"
            inputMode="url" // texto, não type="url": aceita "pousadax.com.br" (o servidor põe o https://)
            autoCapitalize="none"
            maxLength={500}
            placeholder="pousadax.com.br"
            defaultValue={v.linkDemo}
            className={estiloCampo}
          />
          <span className={estiloDica}>O site de exemplo que você fez para ele.</span>
        </label>

        <label className="flex flex-col gap-2">
          <span className={estiloRotulo}>Instagram</span>
          <input
            name="instagram"
            maxLength={200}
            autoCapitalize="none"
            placeholder="@pousada ou o link"
            defaultValue={v.instagram}
            className={estiloCampo}
          />
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-2">
            <span className={estiloRotulo}>Nota no Google</span>
            <input
              name="notaGoogle"
              inputMode="decimal"
              maxLength={4}
              placeholder="4,5"
              defaultValue={v.notaGoogle}
              className={estiloCampo}
            />
          </label>
          <label className="flex flex-col gap-2">
            <span className={estiloRotulo}>Avaliações</span>
            <input
              name="avaliacoesGoogle"
              inputMode="numeric"
              maxLength={11}
              placeholder="562"
              defaultValue={v.avaliacoesGoogle}
              className={estiloCampo}
            />
          </label>
        </div>
      </fieldset>

      <label className="flex flex-col gap-2">
        <span className={estiloRotulo}>Observação (opcional)</span>
        <textarea
          name="observacao"
          rows={3}
          maxLength={1000}
          placeholder="Ex.: carro, endereço, como prefere ser atendido..."
          defaultValue={v.observacao}
          className={estiloCampo}
        />
      </label>

      {estado.erro && <p role="alert" className={estiloErro}>{estado.erro}</p>}

      <div className="mt-2 flex flex-col gap-3">
        <button type="submit" disabled={enviando} className={`${estiloBotao} w-full text-lg`}>
          {enviando ? "Salvando..." : "Salvar cliente"}
        </button>
        <Link href={cancelar} className={`${estiloBotaoSecundario} w-full`}>
          Cancelar
        </Link>
      </div>
    </form>
  );
}
