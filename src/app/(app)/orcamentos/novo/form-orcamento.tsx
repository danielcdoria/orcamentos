"use client";

// Montagem do orçamento. Roda no navegador para o total atualizar a cada tecla.
// Ao salvar, manda só cliente, observação e linhas; o servidor recalcula os valores.
//
// OPÇÕES PARA O CLIENTE (tudo a partir do próprio item):
// - "Dar opções ao cliente": o item vira um cartão de ESCOLHA. Dentro dele se adicionam as
//   outras opções, e o cliente escolhe 1. A opção marcada (●) é a que já vem escolhida.
// - "Opcional": o item vira adicional (o cliente marca se quiser).
// Ao salvar, isso vira tipo / grupo / padrão de cada item (ver src/lib/opcoes.ts).

import Link from "next/link";
import { useState, useTransition } from "react";
import { AlertTriangle, ListChecks, Plus, Search, Send, Trash2, Undo2, UserPlus } from "lucide-react";
import { salvarOrcamento, type DadosOrcamento } from "../actions";
import { calcularSubtotal, centavosParaTexto, formatarCentavos, lerQuantidade, lerReais } from "@/lib/dinheiro";
import { calcularMargem } from "@/lib/margem";
import { chaveGrupo, padroesEfetivos, type Tipo } from "@/lib/opcoes";
import { clienteBate, normalizar } from "@/lib/busca";
import { STATUS } from "@/lib/status";
import { formatarTelefone } from "@/lib/telefone";
import type { StatusOrcamento } from "@/generated/prisma/enums";
import { BlocoMargem } from "@/components/bloco-margem";
import {
  estiloBotao,
  estiloBotaoSecundario,
  estiloCampo,
  estiloCartao,
  estiloErro,
  estiloRotulo,
} from "@/components/estilos";

type Cliente = { id: string; nome: string; telefone: string | null; cidade: string | null };
type Existente = { numero: number; status: StatusOrcamento };
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
  tipo: Tipo; // fixo (padrão), opção de uma escolha ou adicional
  escolha: number | null; // só para "opcao": de qual cartão de escolha faz parte
  padrao: boolean; // só para "opcao": já vem marcada para o cliente
};

let proximaChave = 1;
let proximaEscolha = 1;

// Linha nova a partir de um item do catálogo, ou de um nome digitado (sem preço ainda)
function novaLinha(origem: ItemCatalogo | string, extra: Partial<Linha> = {}): Linha {
  const item = typeof origem === "string" ? null : origem;
  return {
    chave: proximaChave++,
    descricao: item ? item.descricao : (origem as string),
    unidade: item ? item.unidade : "un",
    quantidadeTexto: "1",
    precoTexto: item ? centavosParaTexto(item.preco) : "",
    custoTexto: item?.custo != null ? centavosParaTexto(item.custo) : "", // sugere o custo do catálogo
    tipo: "fixo",
    escolha: null,
    padrao: false,
    ...extra,
  };
}

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
  existentes,
}: {
  clientes: Cliente[];
  catalogo: ItemCatalogo[];
  clienteInicial: string;
  existentes: Record<string, Existente[]>; // orçamentos não perdidos de cada cliente
}) {
  const [clienteId, setClienteId] = useState(clienteInicial);
  const [linhas, setLinhas] = useState<Linha[]>([]);
  const [nomesEscolhas, setNomesEscolhas] = useState<Record<number, string>>({}); // ex.: { 1: "Material" }
  const [escolhaNova, setEscolhaNova] = useState<number | null>(null); // para pôr o cursor na busca dela
  const [observacao, setObservacao] = useState("");
  const [erro, setErro] = useState<string>();
  const [salvando, iniciarSalvar] = useTransition();
  const [jaEnviado, setJaEnviado] = useState(false); // qual dos dois botões de salvar foi tocado

  const subtotais = linhas.map(subtotalDaLinha);

  // Em cada escolha, qual opção já vem marcada. O total mostra o que o cliente vê ao abrir:
  // fixos + a opção marcada de cada escolha (opcionais só entram se ele marcar).
  const padroes = padroesEfetivos(linhas.map((l) => ({ tipo: l.tipo, grupo: String(l.escolha), padrao: l.padrao })));
  const incluido = linhas.map((l, i) => (l.tipo === "opcao" ? padroes[i] : l.tipo === "fixo"));
  const total = subtotais.reduce<number>((soma, s, i) => soma + (incluido[i] ? (s ?? 0) : 0), 0);
  const temOpcoes = linhas.some((l) => l.tipo !== "fixo");
  const totalAdicionais = subtotais.reduce<number>(
    (soma, s, i) => soma + (linhas[i].tipo === "adicional" ? (s ?? 0) : 0),
    0,
  );

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

  // Blocos da tela, na ordem: itens soltos e cartões de escolha (com todas as opções juntas)
  type Posicao = { linha: Linha; i: number };
  const blocos: ({ tipo: "item"; item: Posicao } | { tipo: "escolha"; id: number; opcoes: Posicao[] })[] = [];
  const escolhasVistas = new Set<number>();
  linhas.forEach((linha, i) => {
    if (linha.tipo !== "opcao" || linha.escolha === null) return blocos.push({ tipo: "item", item: { linha, i } });
    if (escolhasVistas.has(linha.escolha)) return;
    escolhasVistas.add(linha.escolha);
    const opcoes = linhas.flatMap((l, k) => (l.escolha === linha.escolha ? [{ linha: l, i: k }] : []));
    blocos.push({ tipo: "escolha", id: linha.escolha, opcoes });
  });

  // Toda mudança nas linhas apaga o erro antigo (ele pode nem valer mais)
  function mudarLinhas(mudanca: (atual: Linha[]) => Linha[]) {
    setErro(undefined);
    setLinhas(mudanca);
  }

  function adicionar(origem: ItemCatalogo | string) {
    mudarLinhas((atual) => [...atual, novaLinha(origem)]);
  }

  // Outra opção dentro de um cartão de escolha: entra logo depois da última opção dele
  function adicionarOpcao(escolha: number, origem: ItemCatalogo | string) {
    mudarLinhas((atual) => {
      const nova = novaLinha(origem, { tipo: "opcao", escolha });
      const depois = atual.findLastIndex((l) => l.escolha === escolha);
      return [...atual.slice(0, depois + 1), nova, ...atual.slice(depois + 1)];
    });
  }

  function alterar(chave: number, campo: "quantidadeTexto" | "precoTexto" | "custoTexto", valor: string) {
    mudarLinhas((atual) => atual.map((l) => (l.chave === chave ? { ...l, [campo]: valor } : l)));
  }

  // O item vira um cartão de escolha; ele mesmo é a primeira opção (já vem marcada)
  function darOpcoes(chave: number) {
    const id = proximaEscolha++;
    mudarLinhas((atual) =>
      atual.map((l) => (l.chave === chave ? { ...l, tipo: "opcao", escolha: id, padrao: true } : l)),
    );
    setEscolhaNova(id);
  }

  // Volta todas as opções do cartão a itens comuns
  function desfazerEscolha(escolha: number) {
    mudarLinhas((atual) =>
      atual.map((l) => (l.escolha === escolha ? { ...l, tipo: "fixo", escolha: null, padrao: false } : l)),
    );
  }

  function alternarOpcional(chave: number) {
    mudarLinhas((atual) =>
      atual.map((l) => (l.chave === chave ? { ...l, tipo: l.tipo === "adicional" ? "fixo" : "adicional" } : l)),
    );
  }

  // Marca qual opção já vem escolhida para o cliente (e desmarca as outras do cartão)
  function marcarPadrao(chave: number) {
    mudarLinhas((atual) => {
      const escolha = atual.find((l) => l.chave === chave)?.escolha;
      return atual.map((l) => (l.tipo === "opcao" && l.escolha === escolha ? { ...l, padrao: l.chave === chave } : l));
    });
  }

  function remover(chave: number) {
    mudarLinhas((atual) => atual.filter((l) => l.chave !== chave));
  }

  // Nome de cada escolha para o cliente ver. Sem nome: "Opções", "Opções 2"...
  function nomesFinais(): Map<number, string> {
    const nomes = new Map<number, string>();
    const usados = new Set(Object.values(nomesEscolhas).map(chaveGrupo).filter(Boolean));
    let semNome = 0;
    for (const b of blocos) {
      if (b.tipo !== "escolha") continue;
      let nome = (nomesEscolhas[b.id] ?? "").trim().replace(/\s+/g, " ");
      while (!nome) {
        semNome++;
        const sugestao = semNome === 1 ? "Opções" : `Opções ${semNome}`;
        if (!usados.has(chaveGrupo(sugestao))) nome = sugestao;
      }
      nomes.set(b.id, nome);
    }
    return nomes;
  }

  function salvar(marcarEnviado: boolean) {
    setErro(undefined);
    if (!clienteId) return setErro("Escolha o cliente.");
    if (linhas.length === 0) return setErro("Adicione pelo menos um item.");

    const nomes = nomesFinais();
    const vistos = new Set<string>();
    for (const [id, nome] of nomes) {
      if (vistos.has(chaveGrupo(nome))) {
        return setErro(`Duas escolhas com o mesmo nome (“${nome}”). Troque o nome de uma delas.`);
      }
      vistos.add(chaveGrupo(nome));
      if (linhas.filter((l) => l.escolha === id).length < 2) {
        return setErro(`A escolha “${nome}” tem só uma opção. Adicione outra opção nela ou toque em “Desfazer”.`);
      }
    }

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
      dados.push({
        descricao: l.descricao,
        quantidade: l.quantidadeTexto,
        precoUnitario: preco,
        custoUnitario: custo,
        tipo: l.tipo,
        grupo: l.escolha !== null ? nomes.get(l.escolha) : undefined,
        padrao: padroes[i],
      });
    }

    setJaEnviado(marcarEnviado);
    iniciarSalvar(async () => {
      const resultado = await salvarOrcamento({ clienteId, observacao, linhas: dados, jaEnviado: marcarEnviado });
      if (resultado?.erro) setErro(resultado.erro);
    });
  }

  // Quantidade, preço, custo e subtotal de uma linha (igual para item solto e para opção).
  // É uma função comum, e não um componente, para os campos não perderem o foco ao digitar.
  function campos(linha: Linha, i: number, rotuloSubtotal: string) {
    return (
      <>
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
              placeholder="0,00"
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
        <div className="mt-3 flex justify-between gap-3 text-base">
          <span className="text-gray-600">{rotuloSubtotal}</span>
          <span className="font-semibold">
            {subtotais[i] === null ? "confira os números" : formatarCentavos(subtotais[i])}
          </span>
        </div>
      </>
    );
  }

  function botaoRemover(linha: Linha) {
    return (
      <button
        type="button"
        onClick={() => remover(linha.chave)}
        aria-label={`Tirar ${linha.descricao}`}
        className="-mt-1 -mr-2 flex size-11 shrink-0 items-center justify-center rounded-lg text-gray-500 hover:bg-red-50 hover:text-red-700"
      >
        <Trash2 className="size-5" aria-hidden />
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* 1. Cliente */}
      <div className="flex flex-col gap-2">
        <label htmlFor="cliente" className={estiloRotulo}>
          Para qual cliente?
        </label>
        <BuscaCliente
          id="cliente"
          clientes={clientes}
          clienteId={clienteId}
          existentes={existentes[clienteId] ?? []}
          aoEscolher={setClienteId}
        />
      </div>

      {/* 2. Itens do catálogo */}
      <div className="flex flex-col gap-2">
        <label htmlFor="busca" className={estiloRotulo}>
          O que vai no orçamento?
        </label>
        <BuscaCatalogo id="busca" catalogo={catalogo} placeholder="Digite o nome do produto ou serviço" aoEscolher={adicionar} />
      </div>

      {/* Itens e cartões de escolha */}
      {linhas.length === 0 ? (
        <p className="rounded-2xl border-2 border-dashed border-gray-300 px-4 py-6 text-center text-base text-gray-600">
          Nenhum item ainda. Digite acima o nome do que vai no orçamento e toque nele para adicionar.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {blocos.map((bloco) => {
            if (bloco.tipo === "item") {
              const { linha, i } = bloco.item;
              return (
                <li key={linha.chave} className={`${estiloCartao} p-4`}>
                  <div className="flex items-start justify-between gap-3">
                    <span className="pt-2 text-base font-semibold">{linha.descricao}</span>
                    {botaoRemover(linha)}
                  </div>
                  {campos(linha, i, linha.tipo === "adicional" ? "Subtotal (se o cliente marcar)" : "Subtotal")}
                  {/* Opções para o cliente, a partir deste item */}
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-t border-gray-100 pt-2">
                    <label className="flex min-h-11 cursor-pointer items-center gap-2 text-base text-gray-700">
                      <input
                        type="checkbox"
                        checked={linha.tipo === "adicional"}
                        onChange={() => alternarOpcional(linha.chave)}
                        className="size-5 accent-marca"
                      />
                      Opcional: o cliente marca se quiser
                    </label>
                    {linha.tipo === "fixo" && (
                      <button
                        type="button"
                        onClick={() => darOpcoes(linha.chave)}
                        className="flex min-h-11 items-center gap-2 text-base font-medium text-marca"
                      >
                        <ListChecks className="size-5" aria-hidden />
                        Dar opções ao cliente
                      </button>
                    )}
                  </div>
                </li>
              );
            }
            return (
              <li key={`escolha-${bloco.id}`} className="rounded-2xl border-2 border-blue-200 bg-white p-4">
                <p className="flex items-center gap-2 text-base font-semibold">
                  <ListChecks className="size-5 text-marca" aria-hidden />O cliente escolhe 1 destas opções
                </p>
                <label className="mt-3 flex flex-col gap-1">
                  <span className="text-sm text-gray-600">Nome da escolha (o cliente vê; pode deixar vazio)</span>
                  <input
                    value={nomesEscolhas[bloco.id] ?? ""}
                    maxLength={60}
                    placeholder="Ex.: Material, Cor, Acabamento"
                    onChange={(e) => {
                      setErro(undefined);
                      setNomesEscolhas((atual) => ({ ...atual, [bloco.id]: e.target.value }));
                    }}
                    className={estiloCampo}
                  />
                </label>
                <p className="mt-3 text-sm text-gray-600">A opção marcada ● já vem escolhida quando o cliente abre.</p>
                <ul className="mt-2 flex flex-col gap-2">
                  {bloco.opcoes.map(({ linha, i }) => (
                    <li key={linha.chave} className="rounded-xl bg-gray-50 p-3">
                      <div className="flex items-start justify-between gap-3">
                        <label className="flex min-h-11 flex-1 cursor-pointer items-start gap-3 pt-2">
                          <input
                            type="radio"
                            name={`padrao-${bloco.id}`}
                            checked={padroes[i]}
                            onChange={() => marcarPadrao(linha.chave)}
                            aria-label={`${linha.descricao} já vem marcada`}
                            className="mt-0.5 size-5 shrink-0 accent-marca"
                          />
                          <span className="text-base font-semibold">
                            {linha.descricao}
                            {padroes[i] && (
                              <span className="ml-2 inline-block rounded-full bg-green-50 px-2 py-0.5 text-sm font-medium text-green-800">
                                já vem marcada
                              </span>
                            )}
                          </span>
                        </label>
                        {botaoRemover(linha)}
                      </div>
                      {campos(linha, i, padroes[i] ? "Subtotal" : "Subtotal (se o cliente escolher)")}
                    </li>
                  ))}
                </ul>
                {bloco.opcoes.length < 2 && (
                  <p className="mt-3 text-base font-medium text-amber-900">Agora adicione a outra opção:</p>
                )}
                <div className="mt-2">
                  <BuscaCatalogo
                    catalogo={catalogo}
                    placeholder="Adicionar outra opção (ex.: MDF resistente)"
                    autoFocus={escolhaNova === bloco.id}
                    aoEscolher={(origem) => adicionarOpcao(bloco.id, origem)}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => desfazerEscolha(bloco.id)}
                  className="mt-2 flex min-h-11 items-center gap-2 text-base text-gray-700 underline underline-offset-2"
                >
                  <Undo2 className="size-5" aria-hidden />
                  Desfazer (voltar a itens comuns)
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {/* Total */}
      <div className={`${estiloCartao} px-5 py-5`}>
        <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-1">
          <span className="text-lg font-medium">Total</span>
          <span className="text-3xl font-extrabold text-marca tabular-nums">{formatarCentavos(total)}</span>
        </div>
        {temOpcoes && (
          <p className="mt-2 text-sm text-gray-600">
            Com as opções que já vêm marcadas. O cliente pode trocar na página do orçamento e o total muda na hora.
            {totalAdicionais > 0 && ` Opcionais, se ele marcar todos: + ${formatarCentavos(totalAdicionais)}.`}
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
        <button type="button" onClick={() => salvar(false)} disabled={salvando} className={`${estiloBotao} w-full text-lg`}>
          {salvando && !jaEnviado ? "Salvando..." : "Salvar orçamento"}
        </button>
        {/* Para quem manda a mensagem por fora: salva já como enviado (a cobrança começa a contar) */}
        <button type="button" onClick={() => salvar(true)} disabled={salvando} className={`${estiloBotaoSecundario} w-full`}>
          <Send className="size-5" aria-hidden />
          {salvando && jaEnviado ? "Salvando..." : "Salvar e marcar como enviado"}
        </button>
        <Link href="/orcamentos" className={`${estiloBotaoSecundario} w-full`}>
          Cancelar
        </Link>
      </div>
    </div>
  );
}

// Escolha do cliente: busca por nome ou telefone (sem ligar para acentos). Escolhido, vira
// um cartão com "Trocar". Se não achar, oferece cadastrar com o nome já digitado.
function BuscaCliente({
  id,
  clientes,
  clienteId,
  existentes,
  aoEscolher,
}: {
  id: string;
  clientes: Cliente[];
  clienteId: string;
  existentes: Existente[];
  aoEscolher: (id: string) => void;
}) {
  const [busca, setBusca] = useState("");
  const [trocando, setTrocando] = useState(false); // tocou em "Trocar": o cursor já vai para a busca
  const escolhido = clientes.find((c) => c.id === clienteId);

  if (escolhido) {
    return (
      <div className="flex flex-col gap-2">
        <div className={`${estiloCartao} flex min-h-16 items-center gap-3 px-4 py-3`}>
          <div className="min-w-0 flex-1">
            <p id={id} className="truncate text-lg font-semibold">{escolhido.nome}</p>
            {escolhido.telefone && <p className="text-base text-gray-600">{formatarTelefone(escolhido.telefone)}</p>}
          </div>
          <button
            type="button"
            onClick={() => {
              aoEscolher("");
              setBusca("");
              setTrocando(true);
            }}
            className={`${estiloBotaoSecundario} shrink-0`}
          >
            Trocar
          </button>
        </div>
        {existentes.length > 0 && (
          // Só um aviso: às vezes é mesmo para fazer outro orçamento.
          <p role="status" className="flex gap-2 rounded-xl bg-amber-50 px-4 py-3 text-base text-amber-900">
            <AlertTriangle className="mt-0.5 size-5 shrink-0" aria-hidden />
            <span>
              {existentes.length === 1 ? "Esta pousada já tem o orçamento " : "Esta pousada já tem os orçamentos "}
              {existentes
                .map((o) => `nº ${o.numero} (${STATUS[o.status].rotulo.replace(" ✓", "")})`)
                .join(", ")}
              .
            </span>
          </p>
        )}
      </div>
    );
  }

  const digitado = busca.trim();
  const resultados = digitado ? clientes.filter((c) => clienteBate(c, digitado)).slice(0, 8) : [];
  const existeIgual = clientes.some((c) => normalizar(c.nome) === normalizar(digitado));

  return (
    <div className="flex flex-col gap-2">
      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-gray-400" aria-hidden />
        <input
          id={id}
          type="search"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Digite o nome ou o telefone"
          autoComplete="off"
          autoFocus={trocando}
          className={`${estiloCampo} pl-12`}
        />
      </div>
      {digitado && (
        <ul className={`${estiloCartao} divide-y divide-gray-200 overflow-hidden`}>
          {resultados.map((c) => (
            <li key={c.id}>
              <button
                type="button"
                onClick={() => aoEscolher(c.id)}
                className="flex min-h-14 w-full items-center gap-3 px-4 py-3 text-left hover:bg-gray-50"
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-base font-medium">{c.nome}</span>
                  {c.telefone && <span className="block text-sm text-gray-600">{formatarTelefone(c.telefone)}</span>}
                </span>
              </button>
            </li>
          ))}
          {!existeIgual && digitado.length <= 120 && (
            <li>
              <Link
                href={`/clientes/novo?voltar=orcamento&nome=${encodeURIComponent(digitado)}`}
                className="flex min-h-14 w-full items-center gap-3 px-4 py-3 text-left hover:bg-gray-50"
              >
                <UserPlus className="size-5 shrink-0 text-gray-500" aria-hidden />
                <span className="flex-1 text-base">
                  Cadastrar “{digitado}”
                  {resultados.length === 0 && (
                    <span className="block text-sm text-gray-600">Nenhum cliente com esse nome ou telefone.</span>
                  )}
                </span>
              </Link>
            </li>
          )}
        </ul>
      )}
      <Link
        href="/clientes/novo?voltar=orcamento"
        className="flex min-h-11 w-fit items-center gap-2 text-base font-medium text-gray-800 underline underline-offset-2"
      >
        <UserPlus className="size-5" aria-hidden />
        Cliente novo? Cadastrar
      </Link>
    </div>
  );
}

// Busca no catálogo com a lista de resultados. Se não achar, deixa usar o nome digitado
// só neste orçamento (a pessoa põe o preço), sem sair da tela.
function BuscaCatalogo({
  id,
  catalogo,
  placeholder,
  autoFocus,
  aoEscolher,
}: {
  id?: string;
  catalogo: ItemCatalogo[];
  placeholder: string;
  autoFocus?: boolean;
  aoEscolher: (origem: ItemCatalogo | string) => void;
}) {
  const [busca, setBusca] = useState("");
  const digitado = busca.trim();
  const termo = digitado.toLowerCase();
  const resultados = termo ? catalogo.filter((i) => i.descricao.toLowerCase().includes(termo)).slice(0, 8) : [];
  const existeIgual = resultados.some((i) => i.descricao.toLowerCase() === termo);

  function escolher(origem: ItemCatalogo | string) {
    aoEscolher(origem);
    setBusca("");
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-gray-400" aria-hidden />
        <input
          id={id}
          type="search"
          value={busca}
          autoFocus={autoFocus} // a pessoa acabou de pedir para dar opções: o próximo passo é buscar a outra
          aria-label={id ? undefined : placeholder}
          onChange={(e) => setBusca(e.target.value)}
          placeholder={placeholder}
          className={`${estiloCampo} pl-12`}
        />
      </div>
      {termo && (
        <ul className={`${estiloCartao} divide-y divide-gray-200 overflow-hidden`}>
          {resultados.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => escolher(item)}
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
          {!existeIgual && digitado.length <= 200 && (
            <li>
              <button
                type="button"
                onClick={() => escolher(digitado)}
                className="flex min-h-14 w-full items-center gap-3 px-4 py-3 text-left hover:bg-gray-50"
              >
                <Plus className="size-5 shrink-0 text-gray-500" aria-hidden />
                <span className="flex-1 text-base">
                  Usar “{digitado}”
                  <span className="block text-sm text-gray-600">
                    {resultados.length === 0 ? "Não está no catálogo. " : ""}Você digita o preço aqui.
                  </span>
                </span>
              </button>
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
