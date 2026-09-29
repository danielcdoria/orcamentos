// O QUE PODE IR PARA O CLIENTE FINAL (página pública /orcamento/<token> e PDF).
//
// Estas telas NÃO usam "include" (que traz todas as colunas): pedem ao banco só os campos
// listados aqui. Assim, informação interna como o CUSTO do item (custoUnitario) nem sai do
// banco nesses caminhos, e não tem como vazar para o HTML, para os dados que o Next manda ao
// navegador ou para o PDF.
//
// ⚠️ Ao adicionar um campo aqui, pergunte: o cliente final pode ver isto? Custo, lucro,
// margem e anotações internas NUNCA entram.
import type { Prisma } from "@/generated/prisma/client";

export const CAMPOS_ITEM_PUBLICO = {
  id: true,
  descricao: true,
  quantidade: true,
  precoUnitario: true,
  subtotal: true,
  tipo: true, // fixo, opção ou adicional
  grupo: true, // nome do grupo de escolha (ex.: "Material")
  incluido: true, // o que está escolhido agora (entra no total)
  // custoUnitario: NÃO (interno)
  // padrao: NÃO (não é preciso: o cliente vê o que está escolhido agora, em "incluido")
} satisfies Prisma.OrcamentoItemSelect;

export const CAMPOS_ORCAMENTO_PUBLICO = {
  id: true,
  empresaId: true, // usado só no servidor, para o registro de abertura
  numero: true,
  total: true,
  observacao: true,
  validoAte: true,
  criadoEm: true,
  cliente: { select: { nome: true, telefone: true } },
  itens: { orderBy: { id: "asc" }, select: CAMPOS_ITEM_PUBLICO },
} satisfies Prisma.OrcamentoSelect;
