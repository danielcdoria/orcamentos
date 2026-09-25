"use client";

import Link from "next/link";
import { useActionState, useTransition } from "react";
import { apagarItem, salvarItem, type EstadoForm } from "./actions";
import {
  estiloBotao,
  estiloBotaoPerigo,
  estiloBotaoSecundario,
  estiloCampo,
  estiloErro,
  estiloRotulo,
} from "@/components/estilos";

type Item = { id: string; descricao: string; unidade: string; precoTexto: string };

const UNIDADES = ["un", "m²", "m", "m³", "h", "kg", "serviço", "diária"];

export function FormItem({ item }: { item?: Item }) {
  const acaoComId = salvarItem.bind(null, item?.id ?? null);
  const [estado, acao, enviando] = useActionState<EstadoForm, FormData>(acaoComId, {});
  const [apagando, iniciarApagar] = useTransition();
  // Depois de um erro, mostra o que foi digitado; senão, os dados do item (ou vazio).
  const v = estado.valores ?? {
    descricao: item?.descricao ?? "",
    unidade: item?.unidade ?? "un",
    precoTexto: item?.precoTexto ?? "",
  };

  function confirmarApagar() {
    if (!item) return;
    if (!confirm(`Apagar "${item.descricao}" do catálogo?`)) return;
    iniciarApagar(() => apagarItem(item.id));
  }

  return (
    <form action={acao} className="flex flex-col gap-5">
      <label className="flex flex-col gap-1">
        <span className={estiloRotulo}>Descrição *</span>
        <input
          name="descricao"
          required
          maxLength={200}
          placeholder="Ex.: Banner em lona 440g"
          defaultValue={v.descricao}
          className={estiloCampo}
        />
      </label>

      <div className="mt-2 flex gap-3">
        <label className="flex flex-1 flex-col gap-1">
          <span className={estiloRotulo}>Preço (R$) *</span>
          <input
            name="preco"
            required
            inputMode="decimal"
            placeholder="0,00"
            defaultValue={v.precoTexto}
            className={estiloCampo}
          />
        </label>

        <label className="flex w-28 flex-col gap-1">
          <span className={estiloRotulo}>Unidade</span>
          {/* list="unidades" mostra sugestões, mas aceita qualquer texto */}
          <input
            name="unidade"
            list="unidades"
            maxLength={20}
            defaultValue={v.unidade}
            className={estiloCampo}
          />
          <datalist id="unidades">
            {UNIDADES.map((u) => (
              <option key={u} value={u} />
            ))}
          </datalist>
        </label>
      </div>

      {estado.erro && <p role="alert" className={estiloErro}>{estado.erro}</p>}

      <div className="mt-2 flex gap-3">
        <Link href="/catalogo" className={`flex-1 ${estiloBotaoSecundario}`}>
          Cancelar
        </Link>
        <button type="submit" disabled={enviando} className={`flex-1 ${estiloBotao}`}>
          {enviando ? "Salvando..." : "Salvar"}
        </button>
      </div>

      {item && (
        <button type="button" onClick={confirmarApagar} disabled={apagando} className={estiloBotaoPerigo}>
          {apagando ? "Apagando..." : "Apagar item"}
        </button>
      )}
    </form>
  );
}
