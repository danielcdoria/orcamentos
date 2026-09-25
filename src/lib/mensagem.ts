// Monta a mensagem de envio trocando as "variáveis" entre chaves pelos dados reais.
// Ex.: "Olá {cliente}, segue: {link}" -> "Olá Maria, segue: https://..."

export const VARIAVEIS_MENSAGEM = {
  cliente: "nome do cliente",
  link: "link do orçamento",
  numero: "número do orçamento",
  total: "valor total",
  empresa: "nome da sua empresa",
} as const;

export type DadosMensagem = Record<keyof typeof VARIAVEIS_MENSAGEM, string>;

export function montarMensagem(modelo: string, dados: DadosMensagem): string {
  return modelo.replace(/\{(\w+)\}/g, (original, nome: string) =>
    nome in dados ? dados[nome as keyof DadosMensagem] : original,
  );
}
