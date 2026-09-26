"use client";

// Montagem do orçamento. Roda no navegador para o total atualizar a cada tecla.
// Ao salvar, manda só cliente, observação e linhas; o servidor recalcula os valores.

import Link from "next/link";
import { useState, useTransition } from "react";
import { Plus, Search, Trash2, UserPlus } from "lucide-react";
import { salvarOrcamento, type DadosOrcamento } from "../actions";
import { calcularSubtotal, centavosParaTexto, formatarCentavos, lerQuantidade, lerReais } from "@/lib/dinheiro";
import {
  estiloBotao,
  estiloBotaoSecundario,
  estiloCampo,
  estiloCartao,
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
  clienteInicial,
}: {
  clientes: Cliente[];
  catalogo: ItemCatalogo[];
  clienteInicial: string;
}) {
  const [clienteId, setClienteId] = useState(clienteInicial);
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
    if (!clienteId) return setErro("Escolha o cliente.");
    if (linhas.length === 0) return setErro("Adicione pelo menos um item.");

    const dados: DadosOrcamento["linhas"] = [];
    for (const [i, l] of linhas.entries()) {
      const preco = lerReais(l.precoTexto);
      if (lerQuantidade(l.quantidadeTexto) === null) {
        return setErro(`Item ${i + 1} (${l.descricao}): a quantidade está errada.`);
      }
      if (preco === null) return setErro(`Item ${i + 1} (${l.descricao}): o preço está errado. Use o formato 12,50.`);
      dados.push({ descricao: l.descricao, quantidade: l.quantidadeTexto, precoUnitario: preco });
    }

    iniciarSalvar(async () => {
      const resultado = await salvarOrcamento({ clienteId, observacao, linhas: dados });
      if (resultado?.erro) setErro(resultado.erro);
    });
  }

  return (
    <div className="flex flex-col gap-6">
      {/* 1. Cliente */}
      <div className="flex flex-col gap-2">
        <label htmlFor="cliente" className={estiloRotulo}>
          Para qual cliente?
        </label>
        <select id="cliente" value={clienteId} onChange={(e) => setClienteId(e.target.value)} className={estiloCampo}>
          <option value="">Escolha o cliente...</option>
          {clientes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nome}
            </option>
          ))}
        </select>
        <Link
          href="/clientes/novo?voltar=orcamento"
          className="flex min-h-11 w-fit items-center gap-2 text-base font-medium text-gray-800 underline underline-offset-2"
        >
          <UserPlus className="size-5" aria-hidden />
          Cliente novo? Cadastrar
        </Link>
      </div>

      {/* 2. Itens do catálogo */}
      <div className="flex flex-col gap-2">
        <label htmlFor="busca" className={estiloRotulo}>
          O que vai no orçamento?
        </label>
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-gray-400" aria-hidden />
          <input
            id="busca"
            type="search"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Digite o nome do produto ou serviço"
            className={`${estiloCampo} pl-12`}
          />
        </div>
        {termo && (
          <ul className={`${estiloCartao} divide-y divide-gray-200 overflow-hidden`}>
            {resultados.length === 0 && (
              <li className="px-4 py-4 text-base text-gray-600">
                Nada com “{busca.trim()}” no catálogo.{" "}
                <Link href="/catalogo/novo" className="font-medium underline">
                  Cadastrar no catálogo
                </Link>
              </li>
            )}
            {resultados.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => adicionar(item)}
                  className="flex min-h-14 w-full items-center gap-3 px-4 py-3 text-left hover:bg-gray-50"
                >
                  <Plus className="size-5 shrink-0 text-gray-500" aria-hidden />
                  <span className="flex-1 text-base">{item.descricao}</span>
                  <span className="shrink-0 text-base text-gray-600">
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
        <p className="rounded-2xl border-2 border-dashed border-gray-300 px-4 py-6 text-center text-base text-gray-600">
          Nenhum item ainda. Digite acima o nome do que vai no orçamento e toque nele para adicionar.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {linhas.map((linha, i) => (
            <li key={linha.chave} className={`${estiloCartao} p-4`}>
              <div className="flex items-start justify-between gap-3">
                <span className="pt-2 text-base font-semibold">{linha.descricao}</span>
                <button
                  type="button"
                  onClick={() => remover(linha.chave)}
                  aria-label={`Tirar ${linha.descricao}`}
                  className="-mt-1 -mr-2 flex size-11 shrink-0 items-center justify-center rounded-lg text-gray-500 hover:bg-red-50 hover:text-red-700"
                >
                  <Trash2 className="size-5" aria-hidden />
                </button>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-3">
                <label className="flex flex-col gap-1">
                  <span className="text-sm text-gray-600">Quantidade ({linha.unidade})</span>
                  <input
                    inputMode="decimal"
                    value={linha.quantidadeTexto}
                    onChange={(e) => alterar(linha.chave, "quantidadeTexto", e.target.value)}
                    className={estiloCampo}
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-sm text-gray-600">Preço (R$)</span>
                  <input
                    inputMode="decimal"
                    value={linha.precoTexto}
                    onChange={(e) => alterar(linha.chave, "precoTexto", e.target.value)}
                    className={estiloCampo}
                  />
                </label>
              </div>
              <div className="mt-3 flex justify-between text-base">
                <span className="text-gray-600">Subtotal</span>
                <span className="font-semibold">
                  {subtotais[i] === null ? "confira os números" : formatarCentavos(subtotais[i])}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* Total */}
      <div className={`${estiloCartao} flex items-center justify-between px-5 py-5`}>
        <span className="text-lg font-medium">Total</span>
        <span className="text-3xl font-extrabold text-marca tabular-nums">{formatarCentavos(total)}</span>
      </div>

      {/* Observação */}
      <label className="flex flex-col gap-2">
        <span className={estiloRotulo}>Observação (opcional)</span>
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

      <div className="flex flex-col gap-3">
        <button type="button" onClick={salvar} disabled={salvando} className={`${estiloBotao} w-full text-lg`}>
          {salvando ? "Salvando..." : "Salvar orçamento"}
        </button>
        <Link href="/orcamentos" className={`${estiloBotaoSecundario} w-full`}>
          Cancelar
        </Link>
      </div>
    </div>
  );
}
