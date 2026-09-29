"use client";

import Link from "next/link";
import { useActionState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import { apagarItem, salvarItem, type EstadoForm } from "./actions";
import {
  estiloBotao,
  estiloBotaoPerigo,
  estiloBotaoSecundario,
  estiloCampo,
  estiloErro,
  estiloRotulo,
} from "@/components/estilos";

type Item = { id: string; descricao: string; unidade: string; precoTexto: string; custoTexto: string };

const UNIDADES = ["un", "m²", "m", "m³", "h", "kg", "serviço", "diária", "par", "jogo", "kit"];

export function FormItem({ item }: { item?: Item }) {
  const acaoComId = salvarItem.bind(null, item?.id ?? null);
  const [estado, acao, enviando] = useActionState<EstadoForm, FormData>(acaoComId, {});
  const [apagando, iniciarApagar] = useTransition();
  // Depois de um erro, mostra o que foi digitado; senão, os dados do item (ou vazio).
  const v = estado.valores ?? {
    descricao: item?.descricao ?? "",
    unidade: item?.unidade ?? "un",
    precoTexto: item?.precoTexto ?? "",
    custoTexto: item?.custoTexto ?? "",
  };

  function confirmarApagar() {
    if (!item) return;
    if (!confirm(`Apagar "${item.descricao}" do catálogo? Os orçamentos já feitos não mudam.`)) return;
    iniciarApagar(() => apagarItem(item.id));
  }

  return (
    <form action={acao} className="flex flex-col gap-5">
      <label className="flex flex-col gap-2">
        <span className={estiloRotulo}>Nome do produto ou serviço</span>
        <input
          name="descricao"
          required
          maxLength={200}
          placeholder="Ex.: Troca de óleo"
          defaultValue={v.descricao}
          className={estiloCampo}
        />
      </label>

      <div className="grid grid-cols-[1fr_8rem] gap-3">
        <label className="flex flex-col gap-2">
          <span className={estiloRotulo}>Preço (R$)</span>
          <input
            name="preco"
            required
            inputMode="decimal"
            placeholder="0,00"
            defaultValue={v.precoTexto}
            className={estiloCampo}
          />
        </label>

        <label className="flex flex-col gap-2">
          <span className={estiloRotulo}>Cobrado por</span>
          {/* list="unidades" mostra sugestões, mas aceita qualquer texto */}
          <input name="unidade" list="unidades" maxLength={20} defaultValue={v.unidade} className={estiloCampo} />
          <datalist id="unidades">
            {UNIDADES.map((u) => (
              <option key={u} value={u} />
            ))}
          </datalist>
        </label>
      </div>
      <p className="-mt-2 text-sm text-gray-600">“Cobrado por”: un (unidade), m², h (hora), kg, serviço...</p>

      <label className="flex flex-col gap-2">
        <span className={estiloRotulo}>Custo para você, por unidade (opcional)</span>
        <input
          name="custo"
          inputMode="decimal"
          placeholder="0,00"
          defaultValue={v.custoTexto}
          className={`${estiloCampo} border-dashed`}
        />
        <span className="text-sm text-gray-600">
          Quanto isso custa pra você (material, terceiros). Só você vê: serve para calcular o lucro do
          orçamento e o cliente nunca recebe.
        </span>
      </label>

      {estado.erro && <p role="alert" className={estiloErro}>{estado.erro}</p>}

      <div className="mt-2 flex flex-col gap-3">
        <button type="submit" disabled={enviando} className={`${estiloBotao} w-full text-lg`}>
          {enviando ? "Salvando..." : "Salvar item"}
        </button>
        <Link href="/catalogo" className={`${estiloBotaoSecundario} w-full`}>
          Cancelar
        </Link>
      </div>

      {item && (
        <button type="button" onClick={confirmarApagar} disabled={apagando} className={`${estiloBotaoPerigo} mt-6 w-full`}>
          <Trash2 className="size-5" aria-hidden />
          {apagando ? "Apagando..." : "Apagar do catálogo"}
        </button>
      )}
    </form>
  );
}
