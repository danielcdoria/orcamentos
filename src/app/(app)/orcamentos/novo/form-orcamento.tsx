"use client";

// Montagem do orçamento. Roda no navegador para o total atualizar a cada tecla.
// Ao salvar, manda só cliente, observação e linhas; o servidor recalcula os valores.

import Link from "next/link";
import { useRef, useState, useTransition } from "react";
import { Plus, Search, Trash2, UserPlus } from "lucide-react";
import { salvarOrcamento, type DadosOrcamento } from "../actions";
import { calcularSubtotal, centavosParaTexto, formatarCentavos, lerQuantidade, lerReais } from "@/lib/dinheiro";
import { calcularMargem } from "@/lib/margem";
import { chaveGrupo, organizar, padroesEfetivos, TIPOS, type Tipo } from "@/lib/opcoes";
import { BlocoMargem } from "@/components/bloco-margem";
import {
  estiloBotao,
  estiloBotaoSecundario,
  estiloCampo,
  estiloCartao,
  estiloErro,
  estiloRotulo,
} from "@/components/estilos";

type Cliente = { id: string; nome: string };
type ItemCatalogo = { id: string; descricao: string; preco: number; unidade: string; custo: number | null };

// Cada linha guarda o que foi DIGITADO (texto), para a pessoa poder apagar e
// reescrever à vontade. A conversão para número acontece na hora de calcular.
type Linha = {
  chave: number;
  descricao: string;
  unidade: string;
  quantidadeTexto: string;
  precoTexto: string;
  custoTexto: string; // custo por unidade (opcional; vazio = não informado). Interno.
  tipo: Tipo; // fixo (padrão), opção de um grupo ou adicional
  grupo: string; // só para "opcao": nome do grupo, ex.: "Material"
  padrao: boolean; // só para "opcao": já vem escolhida no grupo
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
  // "+ Outra opção de Material": o próximo item escolhido na busca entra como opção deste grupo
  const [grupoPendente, setGrupoPendente] = useState<string | null>(null);
  const buscaRef = useRef<HTMLInputElement>(null);
  const [erro, setErro] = useState<string>();
  const [salvando, iniciarSalvar] = useTransition();

  const termo = busca.trim().toLowerCase();
  const resultados = termo
    ? catalogo.filter((i) => i.descricao.toLowerCase().includes(termo)).slice(0, 8)
    : [];

  const subtotais = linhas.map(subtotalDaLinha);

  // Opções: em cada grupo, qual já vem escolhida. O total mostra o que o cliente vê ao abrir:
  // fixos + a opção padrão de cada grupo (adicionais só entram se ele marcar).
  const padroes = padroesEfetivos(linhas);
  const incluido = linhas.map((l, i) => (l.tipo === "opcao" ? padroes[i] : l.tipo === "fixo"));
  const total = subtotais.reduce<number>((soma, s, i) => soma + (incluido[i] ? (s ?? 0) : 0), 0);
  const temOpcoes = linhas.some((l) => l.tipo !== "fixo");
  const totalAdicionais = subtotais.reduce<number>(
    (soma, s, i) => soma + (linhas[i].tipo === "adicional" ? (s ?? 0) : 0),
    0,
  );
  // nomes de grupo já usados, para sugerir ao digitar
  const nomesGrupos = [...new Map(linhas.filter((l) => l.grupo.trim()).map((l) => [chaveGrupo(l.grupo), l.grupo.trim()])).values()];
  // quantas opções cada grupo tem, e qual é a última linha de cada grupo (onde fica o botão "+ Outra opção")
  const tamanhoGrupo = new Map<string, number>();
  const ultimaDoGrupo = new Map<string, number>();
  for (const l of linhas) {
    if (l.tipo !== "opcao") continue;
    tamanhoGrupo.set(chaveGrupo(l.grupo), (tamanhoGrupo.get(chaveGrupo(l.grupo)) ?? 0) + 1);
    ultimaDoGrupo.set(chaveGrupo(l.grupo), l.chave);
  }

  // Custo, lucro e margem (só aparece se algum item tiver custo preenchido).
  // Considera o que está incluído no total.
  const margem = calcularMargem(
    linhas
      .map((l, i) => ({
        quantidade: lerQuantidade(l.quantidadeTexto) ?? 0,
        subtotal: subtotais[i] ?? 0,
        custoUnitario: l.custoTexto.trim() ? lerReais(l.custoTexto) : null,
      }))
      .filter((_, i) => incluido[i]),
  );

  // Toda mudança nas linhas apaga o erro antigo (ele pode nem valer mais)
  function mudarLinhas(mudanca: (atual: Linha[]) => Linha[]) {
    setErro(undefined);
    setLinhas(mudanca);
  }

  function adicionar(item: ItemCatalogo) {
    const nova: Linha = {
      chave: proximaChave++,
      descricao: item.descricao,
      unidade: item.unidade,
      quantidadeTexto: "1",
      precoTexto: centavosParaTexto(item.preco),
      custoTexto: item.custo !== null ? centavosParaTexto(item.custo) : "", // sugere o custo do catálogo
      tipo: grupoPendente ? "opcao" : "fixo",
      grupo: grupoPendente ?? "",
      padrao: false,
    };
    mudarLinhas((atual) => {
      if (!grupoPendente) return [...atual, nova];
      // outra opção de um grupo: entra logo depois da última opção desse grupo
      const depois = atual.findLastIndex((l) => l.tipo === "opcao" && chaveGrupo(l.grupo) === chaveGrupo(grupoPendente));
      return depois === -1 ? [...atual, nova] : [...atual.slice(0, depois + 1), nova, ...atual.slice(depois + 1)];
    });
    setGrupoPendente(null);
    setBusca("");
  }

  function pedirOutraOpcao(grupo: string) {
    setGrupoPendente(grupo.trim());
    setBusca("");
    buscaRef.current?.focus();
    buscaRef.current?.scrollIntoView({ block: "center", behavior: "smooth" });
  }

  function alterar(chave: number, campo: "quantidadeTexto" | "precoTexto" | "custoTexto" | "grupo", valor: string) {
    mudarLinhas((atual) => atual.map((l) => (l.chave === chave ? { ...l, [campo]: valor } : l)));
  }

  function mudarTipo(chave: number, tipo: Tipo) {
    mudarLinhas((atual) => {
      // Ao virar "Opção", já sugere o último grupo usado (quase sempre é o mesmo)
      const ultimoGrupo = atual.findLast((l) => l.chave !== chave && l.tipo === "opcao")?.grupo ?? "";
      return atual.map((l) =>
        l.chave === chave ? { ...l, tipo, grupo: tipo === "opcao" && !l.grupo ? ultimoGrupo : l.grupo } : l,
      );
    });
  }

  // Marca esta opção como a padrão do grupo (e desmarca as outras do mesmo grupo)
  function tornarPadrao(chave: number) {
    mudarLinhas((atual) => {
      const grupo = chaveGrupo(atual.find((l) => l.chave === chave)?.grupo ?? "");
      return atual.map((l) =>
        l.tipo === "opcao" && chaveGrupo(l.grupo) === grupo ? { ...l, padrao: l.chave === chave } : l,
      );
    });
  }

  function remover(chave: number) {
    mudarLinhas((atual) => atual.filter((l) => l.chave !== chave));
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
      const custo = l.custoTexto.trim() ? lerReais(l.custoTexto) : null;
      if (l.custoTexto.trim() && custo === null) {
        return setErro(`Item ${i + 1} (${l.descricao}): o custo está errado. Use o formato 12,50 ou deixe vazio.`);
      }
      if (l.tipo === "opcao" && !l.grupo.trim()) {
        return setErro(`Item ${i + 1} (${l.descricao}): escreva o nome do grupo (ex.: Material).`);
      }
      dados.push({
        descricao: l.descricao,
        quantidade: l.quantidadeTexto,
        precoUnitario: preco,
        custoUnitario: custo,
        tipo: l.tipo,
        grupo: l.grupo,
        padrao: padroes[i],
      });
    }
    for (const g of organizar(linhas).grupos) {
      if (g.itens.length < 2) {
        return setErro(`O grupo “${g.nome}” tem só uma opção. Adicione outra ou marque o item como Fixo.`);
      }
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
        {grupoPendente && (
          <div className="flex items-center justify-between gap-3 rounded-xl bg-blue-50 px-4 py-2 text-base text-marca">
            <span>Busque abaixo a outra opção de “{grupoPendente}”.</span>
            <button type="button" onClick={() => setGrupoPendente(null)} className="min-h-11 shrink-0 font-medium underline">
              Cancelar
            </button>
          </div>
        )}
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-gray-400" aria-hidden />
          <input
            id="busca"
            ref={buscaRef}
            type="search"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder={grupoPendente ? "Ex.: MDF resistente" : "Digite o nome do produto ou serviço"}
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
              <div className="mt-3 grid grid-cols-3 items-end gap-2">
                <label className="flex flex-col gap-1">
                  <span className="text-sm text-gray-600">Qtd ({linha.unidade})</span>
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
                <label className="flex flex-col gap-1">
                  <span className="text-sm text-gray-600">Custo (opcional)</span>
                  <input
                    inputMode="decimal"
                    placeholder="—"
                    value={linha.custoTexto}
                    onChange={(e) => alterar(linha.chave, "custoTexto", e.target.value)}
                    className={`${estiloCampo} border-dashed`}
                  />
                </label>
              </div>
              {/* Tipo: fixo (sempre entra), opção de um grupo (o cliente escolhe 1) ou adicional */}
              <div
                role="radiogroup"
                aria-label={`Tipo de ${linha.descricao}`}
                className="mt-3 grid grid-cols-3 gap-1 rounded-xl bg-gray-100 p-1"
              >
                {TIPOS.map((t) => (
                  <button
                    key={t.valor}
                    type="button"
                    role="radio"
                    aria-checked={linha.tipo === t.valor}
                    onClick={() => mudarTipo(linha.chave, t.valor)}
                    className={`min-h-11 rounded-lg text-base font-medium ${
                      linha.tipo === t.valor ? "bg-white text-gray-900 shadow-sm" : "text-gray-600"
                    }`}
                  >
                    {t.rotulo}
                  </button>
                ))}
              </div>
              {linha.tipo === "opcao" && (
                <div className="mt-2 flex items-end gap-2">
                  <label className="flex min-w-0 flex-1 flex-col gap-1">
                    <span className="text-sm text-gray-600">Grupo (o cliente escolhe 1)</span>
                    <input
                      list="grupos-do-orcamento"
                      value={linha.grupo}
                      maxLength={60}
                      placeholder="Ex.: Material"
                      onChange={(e) => alterar(linha.chave, "grupo", e.target.value)}
                      className={estiloCampo}
                    />
                  </label>
                  <button
                    type="button"
                    aria-pressed={padroes[i]}
                    onClick={() => tornarPadrao(linha.chave)}
                    className={`min-h-12 shrink-0 rounded-xl px-3 text-base font-medium ring-1 ${
                      padroes[i] ? "bg-green-50 text-green-800 ring-green-300" : "text-gray-700 ring-gray-300"
                    }`}
                  >
                    {padroes[i] ? "✓ Padrão" : "Tornar padrão"}
                  </button>
                </div>
              )}
              {linha.tipo === "opcao" && ultimaDoGrupo.get(chaveGrupo(linha.grupo)) === linha.chave && (
                <div className="mt-2 flex flex-col gap-1">
                  {tamanhoGrupo.get(chaveGrupo(linha.grupo)) === 1 && (
                    <p className="text-sm text-amber-900">Falta a outra opção: o grupo precisa de pelo menos 2.</p>
                  )}
                  <button
                    type="button"
                    disabled={!linha.grupo.trim()}
                    onClick={() => pedirOutraOpcao(linha.grupo)}
                    className={`${estiloBotaoSecundario} w-full`}
                  >
                    <Plus className="size-5" aria-hidden />
                    {linha.grupo.trim() ? `Outra opção de “${linha.grupo.trim()}”` : "Escreva o nome do grupo acima"}
                  </button>
                </div>
              )}
              {linha.tipo === "adicional" && (
                <p className="mt-2 text-sm text-gray-600">O cliente marca se quiser. Só entra no total se ele marcar.</p>
              )}
              <div className="mt-3 flex justify-between text-base">
                <span className="text-gray-600">
                  {linha.tipo === "opcao" && !padroes[i]
                    ? "Subtotal (se o cliente escolher)"
                    : linha.tipo === "adicional"
                      ? "Subtotal (se o cliente marcar)"
                      : "Subtotal"}
                </span>
                <span className="font-semibold">
                  {subtotais[i] === null ? "confira os números" : formatarCentavos(subtotais[i])}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}

      <datalist id="grupos-do-orcamento">
        {nomesGrupos.map((nome) => (
          <option key={nome} value={nome} />
        ))}
      </datalist>

      {/* Total */}
      <div className={`${estiloCartao} px-5 py-5`}>
        <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-1">
          <span className="text-lg font-medium">Total</span>
          <span className="text-3xl font-extrabold text-marca tabular-nums">{formatarCentavos(total)}</span>
        </div>
        {temOpcoes && (
          <p className="mt-2 text-sm text-gray-600">
            Com as opções padrão. O cliente pode trocar na página do orçamento e o total muda na hora.
            {totalAdicionais > 0 && ` Adicionais, se ele marcar todos: + ${formatarCentavos(totalAdicionais)}.`}
          </p>
        )}
      </div>

      {/* Custo e margem: interno, só aparece se algum item tiver custo */}
      <BlocoMargem resumo={margem} />

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
