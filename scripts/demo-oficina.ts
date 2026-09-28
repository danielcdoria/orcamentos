// DADOS DE DEMONSTRAÇÃO: "Oficina Silva", oficina mecânica fictícia para vídeos e apresentações.
//
// Uso:  npm run demo            (banco de testes)
//       npm run demo:producao   (site publicado)
//
// Pode rodar quantas vezes quiser: apaga a Oficina Silva anterior (e só ela) e recria tudo
// com as datas contadas a partir de hoje. Rode perto da gravação: sempre haverá exatamente
// 3 orçamentos em "Cobrar hoje". O motor que faz o trabalho está em scripts/demo/motor.ts.
//
// Obs.: o Painel mostra o mês atual. Os orçamentos vão até 25 dias atrás; se rodar no
// comecinho do mês, parte deles cai no mês anterior e os números do mês ficam menores.

import path from "node:path";
import { executar, type ConfigDemo, type Plano } from "./demo/motor";

// ---------- catálogo: 25 itens reais de oficina ----------
const catalogo: ConfigDemo["catalogo"] = [
  ["Troca de óleo 5W30 sintético (4 litros)", 22000, "serviço"],
  ["Filtro de óleo", 4500, "un"],
  ["Filtro de ar do motor", 6000, "un"],
  ["Filtro de ar-condicionado (cabine)", 7000, "un"],
  ["Filtro de combustível", 5500, "un"],
  ["Pastilha de freio dianteira", 18000, "jogo"],
  ["Disco de freio dianteiro", 39000, "par"],
  ["Troca de fluido de freio DOT 4", 9000, "serviço"],
  ["Alinhamento", 9000, "serviço"],
  ["Balanceamento (4 rodas)", 8000, "serviço"],
  ["Kit embreagem (platô, disco e rolamento)", 95000, "kit"],
  ["Mão de obra troca de embreagem", 45000, "serviço"],
  ["Kit correia dentada com tensor", 48000, "kit"],
  ["Mão de obra troca de correia dentada", 28000, "serviço"],
  ["Velas de ignição", 16000, "jogo"],
  ["Bateria 60Ah", 52000, "un"],
  ["Amortecedor dianteiro", 78000, "par"],
  ["Mão de obra suspensão dianteira", 25000, "serviço"],
  ["Bieleta", 14000, "par"],
  ["Pivô de suspensão", 11000, "un"],
  ["Higienização do ar-condicionado", 12000, "serviço"],
  ["Recarga de gás do ar-condicionado", 25000, "serviço"],
  ["Diagnóstico com scanner", 12000, "serviço"],
  ["Troca do líquido de arrefecimento", 15000, "serviço"],
  ["Mão de obra mecânica", 15000, "h"],
];

// ---------- 12 clientes (o carro vai na observação) ----------
const clientes: ConfigDemo["clientes"] = [
  ["Carlos Pereira", "(21) 98712-4410", "Gol G6 2015 prata"],
  ["Ana Paula Souza", "(21) 99654-2278", "HB20 2019 branco"],
  ["João Batista Lima", "(21) 98433-9015", "Uno Way 2014"],
  ["Mariana Costa", "(21) 99218-7763", "Onix LT 2020 vermelho"],
  ["Roberto Almeida", "(21) 98807-3342", "Corolla XEi 2018"],
  ["Fernanda Oliveira", "(21) 99371-5586", "Kwid 2021"],
  ["Paulo Henrique Santos", "(21) 98129-6604", "Saveiro 2017 (trabalho)"],
  ["Juliana Rodrigues", "(21) 99045-1127", "Fox 2016 preto"],
  ["Marcos Vinícius Rocha", "(21) 98562-8839", "Civic 2014"],
  ["Patrícia Gomes", "(21) 99783-2051", "Sandero 2018"],
  ["Ricardo Nunes", "(21) 98276-4493", "Strada 2020"],
  ["Luciana Ferreira", "(21) 99508-3316", "Palio 2012"],
];

// ---------- 18 orçamentos, do mais antigo (nº 1) ao mais novo (nº 18) ----------
// dias = há quantos dias foi enviado. Com os prazos padrão (2, 7 e 15 dias), exatamente
// 3 ficam para "Cobrar hoje": Roberto (2ª cobrança, abriu), Mariana (1ª, abriu) e
// Carlos (1ª, não abriu).
const planos: Plano[] = [
  { cliente: "Paulo Henrique Santos", dias: 25, status: "fechado", abriu: 25, vezes: 2,
    itens: [["Amortecedor dianteiro", 1], ["Mão de obra suspensão dianteira", 1], ["Alinhamento", 1]] },
  { cliente: "Juliana Rodrigues", dias: 22, status: "perdido", abriu: 21,
    cobrancas: [[1, 20], [2, 15]], itens: [["Kit correia dentada com tensor", 1], ["Mão de obra troca de correia dentada", 1]] },
  { cliente: "Roberto Almeida", dias: 20, status: "fechado", abriu: 20, vezes: 3,
    itens: [["Troca de óleo 5W30 sintético (4 litros)", 1], ["Filtro de óleo", 1], ["Filtro de ar do motor", 1], ["Filtro de combustível", 1]] },
  { cliente: "Fernanda Oliveira", dias: 18, status: "respondido", abriu: 17,
    cobrancas: [[1, 16]], itens: [["Higienização do ar-condicionado", 1], ["Recarga de gás do ar-condicionado", 1], ["Filtro de ar-condicionado (cabine)", 1]] },
  { cliente: "João Batista Lima", dias: 17, status: "perdido",
    cobrancas: [[1, 15], [2, 10]], itens: [["Bateria 60Ah", 1], ["Diagnóstico com scanner", 1]] },
  { cliente: "Carlos Pereira", dias: 13, status: "fechado", abriu: 13,
    itens: [["Pastilha de freio dianteira", 1], ["Troca de fluido de freio DOT 4", 1]] },
  { cliente: "Luciana Ferreira", dias: 11, status: "fechado", abriu: 10, vezes: 2,
    itens: [["Velas de ignição", 1], ["Diagnóstico com scanner", 1], ["Mão de obra mecânica", 1.5]] },
  { cliente: "Ricardo Nunes", dias: 9, status: "enviado",
    cobrancas: [[1, 7], [2, 2]], itens: [["Kit embreagem (platô, disco e rolamento)", 1], ["Mão de obra troca de embreagem", 1]],
    obs: "Carro de trabalho: prazo de 1 dia útil." },
  { cliente: "Roberto Almeida", dias: 8, status: "aberto", abriu: 7, vezes: 2,
    cobrancas: [[1, 6]], itens: [["Kit embreagem (platô, disco e rolamento)", 1], ["Mão de obra troca de embreagem", 1], ["Diagnóstico com scanner", 1]],
    obs: "Pedal da embreagem alto e patinando na subida." },
  { cliente: "Patrícia Gomes", dias: 5, status: "aberto", abriu: 4,
    cobrancas: [[1, 3]], itens: [["Amortecedor dianteiro", 1], ["Bieleta", 1], ["Mão de obra suspensão dianteira", 1]] },
  { cliente: "Marcos Vinícius Rocha", dias: 6, status: "fechado", abriu: 6,
    itens: [["Kit correia dentada com tensor", 1], ["Mão de obra troca de correia dentada", 1], ["Troca do líquido de arrefecimento", 1]] },
  { cliente: "Juliana Rodrigues", dias: 5, status: "fechado", abriu: 5, vezes: 2,
    itens: [["Alinhamento", 1], ["Balanceamento (4 rodas)", 1], ["Pivô de suspensão", 2]] },
  { cliente: "Mariana Costa", dias: 3, status: "aberto", abriu: 2, vezes: 2,
    itens: [["Pastilha de freio dianteira", 1], ["Disco de freio dianteiro", 1], ["Troca de fluido de freio DOT 4", 1]],
    obs: "Barulho ao frear. Recomendo trocar os discos junto com as pastilhas." },
  { cliente: "Paulo Henrique Santos", dias: 4, status: "respondido", abriu: 3,
    itens: [["Troca de óleo 5W30 sintético (4 litros)", 1], ["Filtro de óleo", 1]] },
  { cliente: "Carlos Pereira", dias: 2, status: "enviado",
    itens: [["Troca de óleo 5W30 sintético (4 litros)", 1], ["Filtro de óleo", 1], ["Filtro de ar do motor", 1]],
    obs: "Revisão dos 60 mil km." },
  { cliente: "João Batista Lima", dias: 0, status: "enviado",
    itens: [["Diagnóstico com scanner", 1], ["Mão de obra mecânica", 2]] },
  { cliente: "Fernanda Oliveira", dias: 1, status: "aberto", abriu: 0,
    itens: [["Alinhamento", 1], ["Balanceamento (4 rodas)", 1]] },
  { cliente: "Ana Paula Souza", dias: 0, status: "rascunho",
    itens: [["Bateria 60Ah", 1], ["Velas de ignição", 1], ["Mão de obra mecânica", 1]] },
];
const clientesCobrarHoje = ["Roberto Almeida", "Mariana Costa", "Carlos Pereira"];


executar({
  nome: "Oficina Silva",
  email: "demo@oficinasilva.com.br",
  telefone: "(21) 3456-7890",
  condicaoPagamento: "Pix, dinheiro ou cartão em até 3x sem juros. Garantia de 90 dias nos serviços.",
  diasValidade: 15,
  mensagemEnvio: "Olá, {nome}! Aqui é da Oficina Silva. Segue o orçamento do seu carro, no valor de {valor}: {link}",
  logo: path.join(__dirname, "demo", "logo-oficina-silva.png"),
  catalogo,
  clientes,
  planos,
  clientesCobrarHoje,
});
