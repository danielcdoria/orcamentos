// OPÇÕES QUE O CLIENTE ESCOLHE: as regras num lugar só, usadas ao montar o orçamento, na
// página pública, no PDF, na tela interna e na ação que salva a escolha do cliente.
// Não usa nada de servidor: roda também no navegador.
//
// fixo      -> sempre entra no total (o comportamento de sempre)
// opcao     -> pertence a um grupo (ex.: "Material"); exatamente UMA do grupo entra
// adicional -> entra se o cliente marcar (começa desmarcado)

export type Tipo = "fixo" | "opcao" | "adicional";

export const TIPOS: { valor: Tipo; rotulo: string }[] = [
  { valor: "fixo", rotulo: "Fixo" },
  { valor: "opcao", rotulo: "Opção" },
  { valor: "adicional", rotulo: "Adicional" },
];

// "  material " e "Material" são o mesmo grupo
export function chaveGrupo(nome: string | null): string {
  return (nome ?? "").trim().replace(/\s+/g, " ").toLowerCase();
}

export type Organizado<T> = { fixos: T[]; grupos: { nome: string; itens: T[] }[]; adicionais: T[] };

// Separa os itens em fixos, grupos (na ordem em que aparecem) e adicionais.
export function organizar<T extends { tipo: Tipo; grupo: string | null }>(itens: T[]): Organizado<T> {
  const fixos: T[] = [];
  const adicionais: T[] = [];
  const grupos = new Map<string, { nome: string; itens: T[] }>();
  for (const item of itens) {
    if (item.tipo === "opcao") {
      const chave = chaveGrupo(item.grupo);
      if (!grupos.has(chave)) grupos.set(chave, { nome: (item.grupo ?? "").trim() || "Opções", itens: [] });
      grupos.get(chave)!.itens.push(item);
    } else if (item.tipo === "adicional") {
      adicionais.push(item);
    } else {
      fixos.push(item);
    }
  }
  return { fixos, grupos: [...grupos.values()], adicionais };
}

export function temOpcoes(itens: { tipo: Tipo }[]): boolean {
  return itens.some((i) => i.tipo !== "fixo");
}

export function somarIncluidos(itens: { subtotal: number; incluido: boolean }[]): number {
  return itens.reduce((soma, i) => soma + (i.incluido ? i.subtotal : 0), 0);
}

// O maior total que o cliente consegue montar: fixos + a opção mais cara de cada grupo +
// todos os adicionais. Serve para garantir o limite de valor antes de salvar.
export function maiorTotalPossivel(itens: { tipo: Tipo; grupo: string | null; subtotal: number }[]): number {
  const { fixos, grupos, adicionais } = organizar(itens);
  const soma = (lista: { subtotal: number }[]) => lista.reduce((s, i) => s + i.subtotal, 0);
  return soma(fixos) + soma(adicionais) + grupos.reduce((s, g) => s + Math.max(...g.itens.map((i) => i.subtotal)), 0);
}

// Em cada grupo, qual opção é a padrão: a primeira marcada como padrão; se nenhuma estiver
// marcada, a primeira do grupo. Devolve true/false para cada item, na mesma ordem.
export function padroesEfetivos(itens: { tipo: Tipo; grupo: string | null; padrao: boolean }[]): boolean[] {
  const escolhida = new Map<string, number>(); // chave do grupo -> posição da padrão
  itens.forEach((item, i) => {
    if (item.tipo !== "opcao") return;
    const chave = chaveGrupo(item.grupo);
    const atual = escolhida.get(chave);
    if (atual === undefined || (item.padrao && !itens[atual].padrao)) escolhida.set(chave, i);
  });
  const posicoes = new Set(escolhida.values());
  return itens.map((_, i) => posicoes.has(i));
}

// Texto curto da escolha, para o dono ler: "Material: Madeira nobre · + Iluminação em LED"
export function resumoEscolha(
  itens: { tipo: Tipo; grupo: string | null; descricao: string; incluido: boolean }[],
): string {
  const { grupos, adicionais } = organizar(itens);
  const partes = grupos.map((g) => `${g.nome}: ${g.itens.find((i) => i.incluido)?.descricao ?? "nenhuma"}`);
  if (adicionais.length > 0) {
    const marcados = adicionais.filter((i) => i.incluido);
    partes.push(marcados.length > 0 ? marcados.map((i) => `+ ${i.descricao}`).join(" · ") : "sem adicionais");
  }
  return partes.join(" · ");
}
