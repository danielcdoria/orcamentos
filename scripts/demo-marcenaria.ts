// DADOS DE DEMONSTRAÇÃO: "Madeira Nobre", marcenaria fictícia de móveis sob medida
// e montagem, para vídeos e apresentações.
//
// Uso:  npm run demo:marcenaria            (banco de testes)
//       npm run demo:marcenaria:producao   (site publicado)
//
// Pode rodar quantas vezes quiser: apaga a Madeira Nobre anterior (e só ela) e recria tudo com
// as datas contadas a partir de hoje. Sempre haverá exatamente 3 orçamentos em "Cobrar hoje":
// Renata (2ª cobrança, viu), Thiago (1ª, viu) e Cláudia (1ª, não viu).
// O motor que faz o trabalho está em scripts/demo/motor.ts.

import path from "node:path";
import { executar, type ConfigDemo, type Plano } from "./demo/motor";

// ---------- catálogo: 25 produtos e serviços de marcenaria (preços em centavos) ----------
const catalogo: ConfigDemo["catalogo"] = [
  ["Armário de cozinha planejado (MDF)", 145000, "m²"],
  ["Guarda-roupa planejado (MDF 18mm)", 138000, "m²"],
  ["Closet planejado", 150000, "m²"],
  ["Painel de TV ripado", 95000, "m²"],
  ["Painel ripado para cabeceira", 90000, "m²"],
  ["Rack suspenso sob medida", 120000, "un"],
  ["Bancada de banheiro com gaveteiro", 165000, "un"],
  ["Home office planejado (mesa + armário)", 280000, "un"],
  ["Mesa de jantar sob medida (6 lugares)", 390000, "un"],
  ["Tampo em madeira maciça", 180000, "m²"],
  ["Cabeceira estofada sob medida", 110000, "un"],
  ["Nicho de parede (MDF)", 18000, "un"],
  ["Prateleira sob medida", 12000, "m"],
  ["Porta de correr para armário", 65000, "un"],
  ["Gaveta com corrediça telescópica", 22000, "un"],
  ["Puxador perfil em alumínio", 8500, "m"],
  ["Dobradiça com amortecedor", 3500, "un"],
  ["Iluminação LED embutida no móvel", 9500, "m"],
  ["Troca de frentes de armário", 78000, "m²"],
  ["Projeto 3D do ambiente", 35000, "serviço"],
  ["Montagem de guarda-roupa", 25000, "serviço"],
  ["Montagem de cozinha modulada", 45000, "serviço"],
  ["Instalação de móveis planejados", 60000, "diária"],
  ["Desmontagem e remontagem (mudança)", 9000, "h"],
  ["Frete e entrega (Grande Rio)", 15000, "serviço"],
];

// ---------- 12 clientes (o ambiente/imóvel vai na observação) ----------
const clientes: ConfigDemo["clientes"] = [
  ["Eduardo Tavares", "(21) 98841-2276", "Apartamento na Tijuca"],
  ["Sandra Moreira", "(21) 99172-5530", "Casa em Jacarepaguá"],
  ["Renata Barbosa", "(21) 98365-1048", "Apartamento novo no Recreio (cozinha e sala)"],
  ["Felipe Andrade", "(21) 99430-8812", "Trabalha de casa, Botafogo"],
  ["Beatriz Carvalho", "(21) 98056-3391", "Quarto do casal, Méier"],
  ["Cláudia Ribeiro", "(21) 99618-4427", "Sala de estar, Laranjeiras"],
  ["Gustavo Lima", "(21) 98723-9054", "Banheiro social, Vila Isabel"],
  ["Adriana Freitas", "(21) 99284-1165", "Closet do casal, Barra da Tijuca"],
  ["Márcio Teixeira", "(21) 98590-7732", "Quarto de hóspedes, Niterói"],
  ["Thiago Martins", "(21) 99347-6608", "Quarto da filha, Copacabana"],
  ["Luana Pires", "(21) 98114-5289", "Escritório em casa, Flamengo"],
  ["Rogério Campos", "(21) 99875-3140", "Loja no Centro (balcão)"],
];

// ---------- 18 orçamentos ("dias" = há quantos dias foi enviado) ----------
const planos: Plano[] = [
  { cliente: "Eduardo Tavares", dias: 25, status: "fechado", abriu: 25, vezes: 2,
    itens: [["Guarda-roupa planejado (MDF 18mm)", 4.2], ["Porta de correr para armário", 2], ["Instalação de móveis planejados", 1]] },
  { cliente: "Sandra Moreira", dias: 22, status: "perdido", abriu: 21, cobrancas: [[1, 20], [2, 15]],
    itens: [["Mesa de jantar sob medida (6 lugares)", 1], ["Frete e entrega (Grande Rio)", 1]] },
  { cliente: "Renata Barbosa", dias: 20, status: "fechado", abriu: 20, vezes: 3,
    itens: [["Painel de TV ripado", 3.5], ["Rack suspenso sob medida", 1], ["Iluminação LED embutida no móvel", 3]] },
  { cliente: "Felipe Andrade", dias: 18, status: "respondido", abriu: 17, cobrancas: [[1, 16]],
    itens: [["Home office planejado (mesa + armário)", 1], ["Prateleira sob medida", 2.4], ["Projeto 3D do ambiente", 1]] },
  { cliente: "Beatriz Carvalho", dias: 17, status: "perdido", cobrancas: [[1, 15], [2, 10]],
    itens: [["Cabeceira estofada sob medida", 1], ["Painel ripado para cabeceira", 2.2], ["Nicho de parede (MDF)", 2]] },
  { cliente: "Cláudia Ribeiro", dias: 13, status: "fechado", abriu: 13,
    itens: [["Montagem de guarda-roupa", 2], ["Montagem de cozinha modulada", 1]] },
  { cliente: "Gustavo Lima", dias: 11, status: "fechado", abriu: 10, vezes: 2,
    itens: [["Bancada de banheiro com gaveteiro", 1], ["Nicho de parede (MDF)", 1], ["Instalação de móveis planejados", 0.5]] },
  { cliente: "Adriana Freitas", dias: 9, status: "enviado", cobrancas: [[1, 7], [2, 2]],
    itens: [["Closet planejado", 6], ["Gaveta com corrediça telescópica", 4], ["Iluminação LED embutida no móvel", 4]],
    obs: "Closet em L no quarto do casal." },
  { cliente: "Renata Barbosa", dias: 8, status: "aberto", abriu: 7, vezes: 2, cobrancas: [[1, 6]],
    itens: [["Armário de cozinha planejado (MDF)", 7.5], ["Puxador perfil em alumínio", 6], ["Dobradiça com amortecedor", 24], ["Instalação de móveis planejados", 2]],
    obs: "Cozinha em U. Prazo de fabricação: 25 dias úteis após a aprovação do projeto." },
  { cliente: "Márcio Teixeira", dias: 5, status: "aberto", abriu: 4, cobrancas: [[1, 3]],
    itens: [["Guarda-roupa planejado (MDF 18mm)", 3.6], ["Porta de correr para armário", 2]] },
  { cliente: "Eduardo Tavares", dias: 6, status: "fechado", abriu: 6,
    itens: [["Rack suspenso sob medida", 1], ["Painel de TV ripado", 2.8]] },
  { cliente: "Sandra Moreira", dias: 5, status: "fechado", abriu: 5, vezes: 2,
    itens: [["Desmontagem e remontagem (mudança)", 6], ["Frete e entrega (Grande Rio)", 1]] },
  { cliente: "Thiago Martins", dias: 3, status: "aberto", abriu: 2, vezes: 2,
    itens: [["Guarda-roupa planejado (MDF 18mm)", 4.8], ["Gaveta com corrediça telescópica", 6], ["Porta de correr para armário", 3], ["Projeto 3D do ambiente", 1]],
    obs: "Quarto da filha. Acabamento branco com detalhes em freijó." },
  { cliente: "Felipe Andrade", dias: 4, status: "respondido", abriu: 3,
    itens: [["Troca de frentes de armário", 2.5], ["Dobradiça com amortecedor", 10]] },
  { cliente: "Cláudia Ribeiro", dias: 2, status: "enviado",
    itens: [["Painel de TV ripado", 4], ["Rack suspenso sob medida", 1], ["Iluminação LED embutida no móvel", 3]],
    obs: "Parede da sala com 3,20 m de largura." },
  { cliente: "Beatriz Carvalho", dias: 0, status: "enviado",
    itens: [["Montagem de guarda-roupa", 1], ["Frete e entrega (Grande Rio)", 1]] },
  { cliente: "Gustavo Lima", dias: 1, status: "aberto", abriu: 0,
    itens: [["Prateleira sob medida", 3], ["Nicho de parede (MDF)", 3]] },
  { cliente: "Luana Pires", dias: 0, status: "rascunho",
    itens: [["Home office planejado (mesa + armário)", 1], ["Projeto 3D do ambiente", 1]] },
];
const clientesCobrarHoje = ["Renata Barbosa", "Thiago Martins", "Cláudia Ribeiro"];

executar({
  nome: "Madeira Nobre",
  email: "demo@madeiranobre.com.br",
  telefone: "(21) 2567-8901",
  condicaoPagamento:
    "50% de entrada na aprovação do projeto e 50% na entrega. Pix ou cartão em até 10x. Garantia de 1 ano nos móveis e na montagem.",
  diasValidade: 15,
  mensagemEnvio:
    "Olá, {nome}! Aqui é da Madeira Nobre. Segue o orçamento do seu projeto, no valor de {valor}. Qualquer dúvida sobre medidas ou acabamento, é só falar: {link}",
  logo: path.join(__dirname, "demo", "logo-madeira-nobre.png"),
  catalogo,
  clientes,
  planos,
  clientesCobrarHoje,
});
