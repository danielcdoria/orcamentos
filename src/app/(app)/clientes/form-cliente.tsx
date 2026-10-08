"use client";

import Link from "next/link";
import { useActionState } from "react";
import { salvarCliente, type EstadoForm } from "./actions";
import { estiloBotao, estiloBotaoSecundario, estiloCampo, estiloErro, estiloRotulo } from "@/components/estilos";

type Cliente = { id: string; nome: string; telefone: string | null; observacao: string | null };

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
  };
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
