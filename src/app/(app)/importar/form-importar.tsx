"use client";

import Link from "next/link";
import { useActionState } from "react";
import { importarLote, type ResultadoImportar } from "./actions";
import { estiloBotao, estiloCampo, estiloDica, estiloErro, estiloRotulo, estiloSucesso } from "@/components/estilos";

const EXEMPLO =
  "Pousada Exemplo | (31) 99999-8888 | Lavras Novas (MG) | 4,8 | 120\nChalés Exemplo | (35) 98888-7777 | Gonçalves (MG) | 5,0 | 50 | | lote 15";

export function FormImportar({ itens }: { itens: { id: string; rotulo: string }[] }) {
  const [estado, enviar, enviando] = useActionState<ResultadoImportar, FormData>(importarLote, {});

  if (itens.length === 0) {
    return (
      <p className={estiloErro}>
        Cadastre primeiro no <Link href="/catalogo" className="font-semibold underline">Catálogo</Link> o item que vai
        no orçamento (ex.: o plano mensal).
      </p>
    );
  }

  return (
    <form action={enviar} className="flex flex-col gap-5">
      {estado.erro && <p role="alert" className={estiloErro}>{estado.erro}</p>}
      {estado.criados && (
        <div role="status" className={estiloSucesso}>
          <p className="font-semibold">
            {estado.criados.length === 1 ? "1 cliente cadastrado." : `${estado.criados.length} clientes cadastrados.`}
          </p>
          {estado.pulados && estado.pulados.length > 0 && (
            <p className="mt-1">Pulados: {estado.pulados.join(", ")}.</p>
          )}
        </div>
      )}

      <label className="flex flex-col gap-2">
        <span className={estiloRotulo}>Item do orçamento</span>
        <select name="itemId" className={estiloCampo} defaultValue={itens.find((i) => /plano/i.test(i.rotulo))?.id ?? itens[0].id}>
          {itens.map((i) => (
            <option key={i.id} value={i.id}>{i.rotulo}</option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-2">
        <span className={estiloRotulo}>Lista (uma linha por cliente)</span>
        <span className={estiloDica}>
          nome | telefone | cidade | nota | avaliações | link da demonstração | observação. Só nome e telefone são
          obrigatórios. Quem já está cadastrado (mesmo telefone) é pulado.
        </span>
        <textarea
          name="lista"
          rows={12}
          key={estado.lista ?? "vazio"}
          defaultValue={estado.lista}
          required
          placeholder={EXEMPLO}
          className={`${estiloCampo} font-mono text-sm`}
        />
      </label>

      <button type="submit" disabled={enviando} className={estiloBotao}>
        {enviando ? "Importando..." : "Importar e marcar como enviados"}
      </button>
    </form>
  );
}
