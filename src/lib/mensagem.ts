// Monta mensagens trocando as "variáveis" entre chaves pelos dados reais.
// Ex.: "Olá {cliente}, segue: {link}" -> "Olá Maria, segue: https://..."

export const VARIAVEIS_MENSAGEM = {
  nome: "primeiro nome do cliente",
  cliente: "nome completo do cliente",
  empresa: "nome da sua empresa",
  valor: "valor total",
  link: "link do orçamento",
  validade: "data de validade",
  numero: "número do orçamento",
} as const;

// {nome} é calculado a partir do nome completo, por isso não precisa ser passado.
export type DadosMensagem = Record<Exclude<keyof typeof VARIAVEIS_MENSAGEM, "nome">, string>;

// "Maria Souza Lima" -> "Maria". Soa natural numa mensagem de WhatsApp.
export function primeiroNome(nomeCompleto: string): string {
  return nomeCompleto.trim().split(/\s+/)[0] ?? nomeCompleto;
}

export function montarMensagem(modelo: string, dados: DadosMensagem): string {
  // {total} continua funcionando como sinônimo de {valor} (era o nome usado antes)
  const valores: Record<string, string> = {
    ...dados,
    nome: primeiroNome(dados.cliente),
    total: dados.valor,
  };
  return modelo.replace(/\{(\w+)\}/g, (original, nome: string) => valores[nome] ?? original);
}
