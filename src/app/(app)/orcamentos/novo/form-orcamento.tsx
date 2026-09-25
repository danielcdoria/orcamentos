"use client";

// Montagem do orçamento. Roda no navegador para o total atualizar a cada tecla.
// Ao salvar, manda só cliente, observação e linhas; o servidor recalcula os valores.

import Link from "next/link";
import { useState, useTransition } from "react";
import { salvarOrcamento, type DadosOrcamento } from "../actions";
import {
  calcularSubtotal,
  centavosParaTexto,
  formatarCentavos,
  lerQuantidade,
  lerReais,
} from "@/lib/dinheiro";
import {
  estiloBotao,
  estiloBotaoSecundario,
  estiloCampo,
  estiloErro,
  estiloRotulo,
} from "@/components/estilos";

type Cliente = { id: string; nome: string };
type ItemCatalogo = { id: string; descricao: string; preco: number; unidade: string };

// Cada linha guarda o que foi DIGITADO (texto), para a pessoa poder apagar e
// reescrever à vontade. A conversão para número acontece na hora de calcular.
type Linha = {
  chave: number;
  descricao: string;
  unidade: string;
  quantidadeTexto: string;
  precoTexto: string;
};

let proximaChave = 1;

function subtotalDaLinha(linha: Linha): number | null {
  const quantidade = lerQuantidade(linha.quantidadeTexto);
  const preco = lerReais(linha.precoTexto);
  if (quantidade === null || preco === null) return null;
  return calcularSubtotal(quantidade, preco);
}

export function FormOrcamento({
  clientes,
  catalogo,
}: {
  clientes: Cliente[];
  catalogo: ItemCatalogo[];
}) {
  const [clienteId, setClienteId] = useState("");
  const [linhas, setLinhas] = useState<Linha[]>([]);
  const [observacao, setObservacao] = useState("");
  const [busca, setBusca] = useState("");
  const [erro, setErro] = useState<string>();
  const [salvando, iniciarSalvar] = useTransition();

  const termo = busca.trim().toLowerCase();
  const resultados = termo
    ? catalogo.filter((i) => i.descricao.toLowerCase().includes(termo)).slice(0, 8)
    : [];

  const subtotais = linhas.map(subtotalDaLinha);
  const total = subtotais.reduce<number>((soma, s) => soma + (s ?? 0), 0);

  function adicionar(item: ItemCatalogo) {
    setLinhas((atual) => [
      ...atual,
      {
        chave: proximaChave++,
        descricao: item.descricao,
        unidade: item.unidade,
        quantidadeTexto: "1",
        precoTexto: centavosParaTexto(item.preco),
      },
    ]);
    setBusca("");
  }

  function alterar(chave: number, campo: "quantidadeTexto" | "precoTexto", valor: string) {
    setLinhas((atual) => atual.map((l) => (l.chave === chave ? { ...l, [campo]: valor } : l)));
  }

  function remover(chave: number) {
    setLinhas((atual) => atual.filter((l) => l.chave !== chave));
  }

  function salvar() {
    setErro(undefined);
    if (!clienteId) return setErro("Escolha um cliente.");
    if (linhas.length === 0) return setErro("Adicione pelo menos um item.");

    const dados: DadosOrcamento["linhas"] = [];
    for (const [i, l] of linhas.entries()) {
      const preco = lerReais(l.precoTexto);
      if (lerQuantidade(l.quantidadeTexto) === null) {
        return setErro(`Item ${i + 1} (${l.descricao}): quantidade inválida.`);
      }
      if (preco === null) return setErro(`Item ${i + 1} (${l.descricao}): preço inválido.`);
      dados.push({ descricao: l.descricao, quantidade: l.quantidadeTexto, precoUnitario: preco });
    }

    iniciarSalvar(async () => {
      const resultado = await salvarOrcamento({ clienteId, observacao, linhas: dados });
      if (resultado?.erro) setErro(resultado.erro);
    });
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Cliente */}
      <label className="flex flex-col gap-1">
        <span className={estiloRotulo}>Cliente *</span>
        <select value={clienteId} onChange={(e) => setClienteId(e.target.value)} className={estiloCampo}>
          <option value="">Escolha...</option>
          {clientes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nome}
            </option>
          ))}
        </select>
      </label>

      {/* Busca no catálogo */}
      <div className="flex flex-col gap-1">
        <span className={estiloRotulo}>Adicionar item do catálogo</span>
        <input
          type="search"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Digite para buscar..."
          className={estiloCampo}
        />
        {termo && (
          <ul className="divide-y divide-gray-200 rounded-lg border border-gray-200">
            {resultados.length === 0 && (
              <li className="px-4 py-3 text-sm text-gray-600">Nenhum item encontrado.</li>
            )}
            {resultados.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => adicionar(item)}
                  className="flex w-full items-center justify-between gap-4 px-4 py-3 text-left hover:bg-gray-50"
                >
                  <span>{item.descricao}</span>
                  <span className="shrink-0 text-sm text-gray-600">
                    {formatarCentavos(item.preco)}/{item.unidade}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Linhas do orçamento */}
      {linhas.length === 0 ? (
        <p className="rounded-lg border border-dashed border-gray-300 px-4 py-6 text-center text-gray-600">
          Nenhum item ainda. Busque acima para adicionar.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {linhas.map((linha, i) => (
            <li key={linha.chave} className="rounded-lg border border-gray-200 p-4">
              <div className="flex items-start justify-between gap-3">
                <span className="font-medium">{linha.descricao}</span>
                <button
                  type="button"
                  onClick={() => remover(linha.chave)}
                  aria-label={`Remover ${linha.descricao}`}
                  className="-m-2 p-2 text-gray-500 hover:text-red-700"
                >
                  ✕
                </button>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-3">
                <label className="flex flex-col gap-1">
                  <span className="text-xs text-gray-600">Quantidade ({linha.unidade})</span>
                  <input
                    inputMode="decimal"
                    value={linha.quantidadeTexto}
                    onChange={(e) => alterar(linha.chave, "quantidadeTexto", e.target.value)}
                    className={estiloCampo}
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-xs text-gray-600">Preço unitário (R$)</span>
                  <input
                    inputMode="decimal"
                    value={linha.precoTexto}
                    onChange={(e) => alterar(linha.chave, "precoTexto", e.target.value)}
                    className={estiloCampo}
                  />
                </label>
              </div>
              <div className="mt-3 flex justify-between text-sm">
                <span className="text-gray-600">Subtotal</span>
                <span className="font-semibold">
                  {subtotais[i] === null ? "valor inválido" : formatarCentavos(subtotais[i])}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* Total */}
      <div className="flex items-center justify-between rounded-lg bg-gray-100 px-4 py-4">
        <span className="font-medium">Total</span>
        <span className="text-xl font-bold">{formatarCentavos(total)}</span>
      </div>

      {/* Observação */}
      <label className="flex flex-col gap-1">
        <span className={estiloRotulo}>Observação</span>
        <textarea
          rows={3}
          maxLength={2000}
          value={observacao}
          onChange={(e) => setObservacao(e.target.value)}
          placeholder="Ex.: prazo de entrega, condições especiais..."
          className={estiloCampo}
        />
      </label>

      {erro && <p role="alert" className={estiloErro}>{erro}</p>}

      <div className="flex gap-3">
        <Link href="/orcamentos" className={`flex-1 ${estiloBotaoSecundario}`}>
          Cancelar
        </Link>
        <button type="button" onClick={salvar} disabled={salvando} className={`flex-1 ${estiloBotao}`}>
          {salvando ? "Salvando..." : "Salvar orçamento"}
        </button>
      </div>
    </div>
  );
}
