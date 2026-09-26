// Monta mensagens trocando as "variáveis" entre chaves pelos dados reais.
// Ex.: "Olá {cliente}, segue: {link}" -> "Olá Maria, segue: https://..."

export const VARIAVEIS_MENSAGEM = {
  cliente: "nome do cliente",
  empresa: "nome da sua empresa",
  valor: "valor total",
  link: "link do orçamento",
  validade: "data de validade",
  numero: "número do orçamento",
} as const;

export type DadosMensagem = Record<keyof typeof VARIAVEIS_MENSAGEM, string>;

export function montarMensagem(modelo: string, dados: DadosMensagem): string {
  // {total} continua funcionando como sinônimo de {valor} (era o nome usado antes)
  const valores: Record<string, string> = { ...dados, total: dados.valor };
  return modelo.replace(/\{(\w+)\}/g, (original, nome: string) => valores[nome] ?? original);
}
