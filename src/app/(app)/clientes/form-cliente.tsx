"use client";

import Link from "next/link";
import { useActionState } from "react";
import { salvarCliente, type EstadoForm } from "./actions";
import { estiloBotao, estiloBotaoSecundario, estiloCampo, estiloErro, estiloRotulo } from "@/components/estilos";

type Cliente = { id: string; nome: string; telefone: string | null; observacao: string | null };

// O mesmo formulário serve para criar (sem cliente) e editar (com cliente).
export function FormCliente({ cliente }: { cliente?: Cliente }) {
  // bind "prende" o id como primeiro argumento da ação
  const acaoComId = salvarCliente.bind(null, cliente?.id ?? null);
  const [estado, acao, enviando] = useActionState<EstadoForm, FormData>(acaoComId, {});
  // Depois de um erro, mostra o que foi digitado; senão, os dados do cliente (ou vazio).
  const v = estado.valores ?? {
    nome: cliente?.nome ?? "",
    telefone: cliente?.telefone ?? "",
    observacao: cliente?.observacao ?? "",
  };

  return (
    <form action={acao} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1">
        <span className={estiloRotulo}>Nome *</span>
        <input name="nome" required maxLength={120} defaultValue={v.nome} className={estiloCampo} />
      </label>

      <label className="flex flex-col gap-1">
        <span className={estiloRotulo}>Telefone</span>
        <input
          name="telefone"
          type="tel"
          inputMode="tel"
          placeholder="(21) 99999-9999"
          defaultValue={v.telefone}
          className={estiloCampo}
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className={estiloRotulo}>Observação</span>
        <textarea
          name="observacao"
          rows={3}
          maxLength={1000}
          defaultValue={v.observacao}
          className={estiloCampo}
        />
      </label>

      {estado.erro && <p role="alert" className={estiloErro}>{estado.erro}</p>}

      <div className="flex gap-3">
        <Link href="/clientes" className={`flex-1 ${estiloBotaoSecundario}`}>
          Cancelar
        </Link>
        <button type="submit" disabled={enviando} className={`flex-1 ${estiloBotao}`}>
          {enviando ? "Salvando..." : "Salvar"}
        </button>
      </div>
    </form>
  );
}
