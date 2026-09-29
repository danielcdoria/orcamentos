"use client";

// ORÇAMENTO COM OPÇÕES, na página pública: o cliente escolhe uma opção de cada grupo e marca
// os adicionais que quiser; o total muda na hora, sem recarregar. A escolha é salva sozinha
// (1 segundo depois da última mudança) pela ação pública em ./actions.ts.
//
// O ProvedorEscolha guarda a escolha atual e a compartilha com as peças da página
// (opções, total e botões), que ficam em lugares diferentes da tela.

import { createContext, useCallback, useContext, useEffect, useRef, useState, type MouseEvent, type ReactNode } from "react";
import { salvarEscolha } from "./actions";
import { CaixaTotal, LinkResponder } from "./blocos";
import { BotaoPdf } from "./botao-pdf";
import { formatarCentavos } from "@/lib/dinheiro";
import { chaveGrupo, organizar, resumoEscolha, somarIncluidos, type Tipo } from "@/lib/opcoes";

// Só o que o cliente pode ver (montado no servidor a partir de src/lib/publico.ts)
export type ItemEscolha = {
  id: string;
  descricao: string;
  quantidade: string; // já formatada: "2,5"
  unitario: number; // centavos
  subtotal: number; // centavos
  tipo: Tipo;
  grupo: string | null;
  incluido: boolean;
};

type Situacao = "parado" | "salvando" | "salvo" | "erro";

type Contexto = {
  itens: ItemEscolha[];
  total: number;
  situacao: Situacao;
  erro: string | null;
  previa: boolean; // a própria empresa olhando: pode mexer, mas não salva
  bloqueado: boolean; // orçamento fechado: não muda mais
  escolher: (id: string) => void;
  alternar: (id: string) => void;
  salvarAgora: () => Promise<void>;
};

const ContextoEscolha = createContext<Contexto | null>(null);

function useEscolha(): Contexto {
  const c = useContext(ContextoEscolha);
  if (!c) throw new Error("useEscolha fora do ProvedorEscolha");
  return c;
}

const ESPERA_MS = 1000;

export function ProvedorEscolha({
  token,
  itens: iniciais,
  previa,
  bloqueado,
  children,
}: {
  token: string;
  itens: ItemEscolha[];
  previa: boolean;
  bloqueado: boolean;
  children: ReactNode;
}) {
  const [itens, setItens] = useState(iniciais);
  const [situacao, setSituacao] = useState<Situacao>("parado");
  const [erro, setErro] = useState<string | null>(null);
  const pendente = useRef<string[] | null>(null); // escolha ainda não salva (ids marcados)
  const relogio = useRef<ReturnType<typeof setTimeout>>(undefined);

  const salvarAgora = useCallback(async () => {
    clearTimeout(relogio.current);
    const marcados = pendente.current;
    if (!marcados || previa || bloqueado) return;
    pendente.current = null;
    setSituacao("salvando");
    try {
      const r = await salvarEscolha(token, marcados);
      setSituacao(r.ok ? "salvo" : "erro");
      setErro(r.ok ? null : r.erro);
    } catch {
      pendente.current ??= marcados; // tenta de novo na próxima mudança
      setSituacao("erro");
      setErro("Sem conexão: sua escolha ainda não foi salva.");
    }
  }, [token, previa, bloqueado]);

  // Se o cliente sair da página logo depois de mexer, salva antes
  useEffect(() => {
    const aoEsconder = () => {
      if (document.visibilityState === "hidden") void salvarAgora();
    };
    document.addEventListener("visibilitychange", aoEsconder);
    return () => document.removeEventListener("visibilitychange", aoEsconder);
  }, [salvarAgora]);

  function mudar(novos: ItemEscolha[]) {
    setItens(novos);
    if (previa || bloqueado) return;
    pendente.current = novos.filter((i) => i.tipo !== "fixo" && i.incluido).map((i) => i.id);
    clearTimeout(relogio.current);
    relogio.current = setTimeout(() => void salvarAgora(), ESPERA_MS);
  }

  // Opção: marca esta e desmarca as outras do mesmo grupo
  function escolher(id: string) {
    const grupo = chaveGrupo(itens.find((i) => i.id === id)?.grupo ?? null);
    mudar(itens.map((i) => (i.tipo === "opcao" && chaveGrupo(i.grupo) === grupo ? { ...i, incluido: i.id === id } : i)));
  }

  // Adicional: marca ou desmarca
  function alternar(id: string) {
    mudar(itens.map((i) => (i.id === id && i.tipo === "adicional" ? { ...i, incluido: !i.incluido } : i)));
  }

  const valor: Contexto = {
    itens,
    total: somarIncluidos(itens),
    situacao,
    erro,
    previa,
    bloqueado,
    escolher,
    alternar,
    salvarAgora,
  };
  return <ContextoEscolha.Provider value={valor}>{children}</ContextoEscolha.Provider>;
}

// Links que levam para fora (WhatsApp, PDF): se houver escolha não salva, salva primeiro
function seguirDepoisDeSalvar(e: MouseEvent<HTMLAnchorElement>, salvarAgora: () => Promise<void>) {
  const href = e.currentTarget.href;
  e.preventDefault();
  void salvarAgora().finally(() => window.location.assign(href));
}

// Grupos (escolha única) e adicionais (marcar à vontade), com áreas de toque grandes
export function OpcoesDoCliente() {
  const { itens, bloqueado, escolher, alternar } = useEscolha();
  const { grupos, adicionais } = organizar(itens);
  const cartao =
    "flex min-h-16 cursor-pointer items-center gap-4 rounded-xl border-2 border-gray-200 px-4 py-3 has-checked:border-marca has-checked:bg-blue-50 has-disabled:cursor-default";

  return (
    <section className="flex flex-col gap-6 px-5 pt-6 sm:px-8">
      <p className="rounded-lg bg-gray-50 px-3 py-2 text-base text-gray-700">
        {bloqueado
          ? "Estas foram as opções escolhidas."
          : "Este orçamento tem opções. Escolha abaixo: o total muda na hora."}
      </p>

      {grupos.map((g, n) => (
        <fieldset key={g.nome} disabled={bloqueado} className="flex flex-col gap-2">
          <legend className="text-lg font-semibold">{g.nome}</legend>
          <p className="-mt-1 text-base text-gray-600">Escolha uma opção</p>
          {g.itens.map((item) => (
            <label key={item.id} className={cartao}>
              <input
                type="radio"
                name={`grupo-${n}`}
                checked={item.incluido}
                onChange={() => escolher(item.id)}
                className="size-6 shrink-0 accent-marca"
              />
              <Descricao item={item} />
              <span className="shrink-0 text-base font-semibold tabular-nums">{formatarCentavos(item.subtotal)}</span>
            </label>
          ))}
        </fieldset>
      ))}

      {adicionais.length > 0 && (
        <fieldset disabled={bloqueado} className="flex flex-col gap-2">
          <legend className="text-lg font-semibold">Adicionais</legend>
          <p className="-mt-1 text-base text-gray-600">Marque o que quiser incluir</p>
          {adicionais.map((item) => (
            <label key={item.id} className={cartao}>
              <input
                type="checkbox"
                checked={item.incluido}
                onChange={() => alternar(item.id)}
                className="size-6 shrink-0 accent-marca"
              />
              <Descricao item={item} />
              <span className="shrink-0 text-base font-semibold tabular-nums">+ {formatarCentavos(item.subtotal)}</span>
            </label>
          ))}
        </fieldset>
      )}
    </section>
  );
}

function Descricao({ item }: { item: ItemEscolha }) {
  return (
    <span className="min-w-0 flex-1">
      <span className="block text-base font-medium">{item.descricao}</span>
      {item.quantidade !== "1" && (
        <span className="block text-sm text-gray-600">
          {item.quantidade} × {formatarCentavos(item.unitario)}
        </span>
      )}
    </span>
  );
}

// Total que acompanha a escolha, com um aviso discreto de "salvo"
export function TotalAoVivo() {
  const { total, situacao, erro, previa, bloqueado } = useEscolha();
  const aviso = previa
    ? "Você está vendo como o cliente: o que marcar aqui não é salvo."
    : bloqueado
      ? null
      : situacao === "salvando"
        ? "Salvando sua escolha..."
        : situacao === "salvo"
          ? "Sua escolha foi salva ✓"
          : situacao === "erro"
            ? erro
            : null;

  return (
    <>
      <CaixaTotal valor={total} aoVivo />
      <p
        role="status"
        className={`mx-5 mt-2 min-h-6 text-sm sm:mx-8 sm:text-right ${situacao === "erro" ? "text-red-700" : "text-gray-600"}`}
      >
        {aviso}
      </p>
    </>
  );
}

// "Responder no WhatsApp" já com a escolha do cliente no texto
export function ResponderComEscolha({ whatsEmpresa, numero }: { whatsEmpresa: string; numero: number }) {
  const { itens, total, salvarAgora } = useEscolha();
  const texto = `Olá! Vi o orçamento nº ${numero}. Minha escolha: ${resumoEscolha(itens)}. Total: ${formatarCentavos(total)}.`;
  return <LinkResponder whatsEmpresa={whatsEmpresa} texto={texto} onClick={(e) => seguirDepoisDeSalvar(e, salvarAgora)} />;
}

// "Baixar PDF": o PDF sai com a escolha atual, então salva antes de baixar
export function PdfComEscolha({ token }: { token: string }) {
  const { salvarAgora } = useEscolha();
  return <BotaoPdf token={token} onClick={(e) => seguirDepoisDeSalvar(e, salvarAgora)} />;
}
