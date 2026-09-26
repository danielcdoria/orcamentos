// DADOS DE DEMONSTRAÇÃO: cria a "Oficina Silva", uma oficina mecânica fictícia com
// clientes, catálogo e orçamentos espalhados pelos últimos dias, para gravar vídeos.
//
// Uso (na pasta do projeto):  npm run demo
//
// Pode rodar quantas vezes quiser: a cada vez, APAGA a Oficina Silva anterior (e só ela)
// e cria tudo de novo, com as datas contadas a partir de hoje. Rode perto da gravação:
// sempre haverá exatamente 3 orçamentos em "Cobrar hoje".
//
// Obs.: o Painel mostra o mês atual. Os orçamentos vão até 25 dias atrás; se rodar no
// comecinho do mês, parte deles cai no mês anterior e os números do mês ficam menores.

import "dotenv/config";
import { readFileSync } from "node:fs";
import path from "node:path";
import { createInterface } from "node:readline";
import { prisma } from "@/lib/prisma";
import { gerarHashSenha } from "@/lib/senha";
import { calcularSubtotal } from "@/lib/dinheiro";
import { telefoneParaWhatsApp } from "@/lib/telefone";
import type { StatusOrcamento } from "@/generated/prisma/enums";

const EMAIL_DEMO = "demo@oficinasilva.com.br";

// ---------- perguntas no terminal ----------
const terminal = createInterface({ input: process.stdin });
const linhas = terminal[Symbol.asyncIterator]();
async function perguntar(texto: string): Promise<string> {
  process.stdout.write(texto);
  const { value, done } = await linhas.next();
  return done ? "" : String(value).trim();
}

// ---------- datas (horário de Brasília) ----------
const hojeBrasilia = Object.fromEntries(
  new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "numeric", day: "numeric" })
    .formatToParts(new Date())
    .map((p) => [p.type, Number(p.value)]),
);
// "n dias atrás, às h horas (de Brasília)". Nunca devolve um horário no futuro.
function diasAtras(n: number, hora = 10, minuto = 0): Date {
  const d = new Date(Date.UTC(hojeBrasilia.year, hojeBrasilia.month - 1, hojeBrasilia.day - n, hora + 3, minuto));
  const agora = new Date();
  return d > agora ? new Date(agora.getTime() - 20 * 60_000) : d;
}

// ---------- catálogo: 25 itens reais de oficina ----------
const CATALOGO: [string, number, string][] = [
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
const CLIENTES: [string, string, string][] = [
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
type Plano = {
  cliente: string;
  dias: number;
  status: StatusOrcamento;
  abriu?: number; // aberto há quantos dias (e quantas vezes: ver vezes)
  vezes?: number;
  cobrancas?: [etapa: 1 | 2, diasAtras: number][];
  itens: [descricao: string, quantidade: number][];
  obs?: string;
};
const PLANOS: Plano[] = [
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
const CLIENTES_COBRAR_HOJE = ["Roberto Almeida", "Mariana Costa", "Carlos Pereira"];

async function apagarDemoAnterior() {
  const usuario = await prisma.usuario.findUnique({ where: { email: EMAIL_DEMO } });
  if (!usuario) return;
  const id = usuario.empresaId;
  await prisma.$transaction([
    prisma.cobranca.deleteMany({ where: { empresaId: id } }),
    prisma.orcamentoItem.deleteMany({ where: { empresaId: id } }),
    prisma.orcamento.deleteMany({ where: { empresaId: id } }),
    prisma.cliente.deleteMany({ where: { empresaId: id } }),
    prisma.item.deleteMany({ where: { empresaId: id } }),
    prisma.sessao.deleteMany({ where: { empresaId: id } }),
    prisma.usuario.deleteMany({ where: { empresaId: id } }),
    prisma.empresaLogo.deleteMany({ where: { empresaId: id } }),
    prisma.empresa.delete({ where: { id } }),
  ]);
  console.log("Oficina Silva anterior apagada.");
}

async function main() {
  console.log("\n=== Dados de demonstração: Oficina Silva ===\n");
  const senha = await perguntar("Senha para o login da demonstração (mínimo 8 caracteres): ");
  if (senha.length < 8) throw new Error("A senha precisa ter pelo menos 8 caracteres.");
  const meuCelular = await perguntar(
    "Seu celular (opcional; Enter para pular). Se informar, os 3 clientes de 'Cobrar hoje'\n" +
      "usam esse número, para você testar o envio mandando para você mesmo: ",
  );
  if (meuCelular && !telefoneParaWhatsApp(meuCelular)) throw new Error("Celular inválido. Use DDD + número.");

  await apagarDemoAnterior();

  const empresa = await prisma.empresa.create({
    data: {
      nome: "Oficina Silva",
      telefone: "(21) 3456-7890",
      condicaoPagamento: "Pix, dinheiro ou cartão em até 3x sem juros. Garantia de 90 dias nos serviços.",
      diasValidade: 15,
      mensagemEnvio: "Olá, {nome}! Aqui é da Oficina Silva. Segue o orçamento do seu carro, no valor de {valor}: {link}",
      criadoEm: diasAtras(40),
      usuario: { create: { email: EMAIL_DEMO, senhaHash: await gerarHashSenha(senha) } },
    },
  });
  const e = empresa.id;

  const logo = readFileSync(path.join(__dirname, "demo", "logo-oficina-silva.png"));
  await prisma.empresaLogo.create({ data: { empresaId: e, dados: new Uint8Array(logo), tipo: "image/png" } });
  await prisma.empresa.update({ where: { id: e }, data: { logoUrl: `/logo/${e}?v=${Date.now()}` } });

  const itens = new Map<string, { preco: number; unidade: string }>();
  for (const [descricao, preco, unidade] of CATALOGO) {
    await prisma.item.create({ data: { empresaId: e, descricao, preco, unidade } });
    itens.set(descricao, { preco, unidade });
  }

  const clientes = new Map<string, string>();
  for (const [i, [nome, telefone, carro]] of CLIENTES.entries()) {
    const tel = meuCelular && CLIENTES_COBRAR_HOJE.includes(nome) ? meuCelular : telefone;
    const c = await prisma.cliente.create({
      data: { empresaId: e, nome, telefone: tel, observacao: carro, criadoEm: diasAtras(35 - i * 2) },
    });
    clientes.set(nome, c.id);
  }

  // Numera na ordem em que foram criados (mais antigo = nº 1), e dá horários crescentes
  // para os orçamentos do mesmo dia.
  const ordenados = [...PLANOS].sort((a, b) => b.dias - a.dias);
  const porDia = new Map<number, number>();

  for (const [i, p] of ordenados.entries()) {
    const linhas = p.itens.map(([descricao, quantidade]) => {
      const item = itens.get(descricao);
      if (!item) throw new Error(`Item não está no catálogo: ${descricao}`);
      return {
        empresaId: e,
        descricao,
        quantidade: String(quantidade),
        precoUnitario: item.preco,
        subtotal: calcularSubtotal(quantidade, item.preco),
      };
    });
    const total = linhas.reduce((s, l) => s + l.subtotal, 0);
    const k = porDia.get(p.dias) ?? 0; // quantos já foram criados neste mesmo dia
    porDia.set(p.dias, k + 1);
    const criadoEm =
      p.dias === 0
        ? new Date(Date.now() - (150 - 45 * k) * 60_000) // hoje: há 2h30, há 1h45...
        : diasAtras(p.dias, 9 + 2 * k, (i * 7) % 60);
    const validoAte = new Date(criadoEm.getTime() + 15 * 86_400_000);
    const enviado = p.status !== "rascunho";
    const abertoEm = p.abriu !== undefined ? diasAtras(p.abriu, 18, 30) : null;

    await prisma.orcamento.create({
      data: {
        empresaId: e,
        clienteId: clientes.get(p.cliente)!,
        numero: i + 1,
        total,
        observacao: p.obs ?? null,
        validoAte,
        status: p.status,
        criadoEm,
        enviadoEm: enviado ? new Date(criadoEm.getTime() + 15 * 60_000) : null,
        abertoEm,
        ultimaAberturaEm: abertoEm,
        vezesAberto: abertoEm ? (p.vezes ?? 1) : 0,
        itens: { create: linhas },
        cobrancas: {
          create: (p.cobrancas ?? []).map(([etapa, d]) => ({
            empresaId: e,
            etapa,
            mensagem: "(mensagem de cobrança enviada)",
            enviadaEm: diasAtras(d, 11),
          })),
        },
      },
    });
  }

  console.log(`\nPronto! Oficina Silva criada: ${CLIENTES.length} clientes, ${CATALOGO.length} itens, ${PLANOS.length} orçamentos.`);
  console.log(`Login: ${EMAIL_DEMO} (com a senha que você digitou)`);
  console.log("Dica: limpe o terminal (Cmd + K) para a senha não ficar na tela.\n");
}

main()
  .catch((erro) => {
    console.error(`\nErro: ${erro.message}\n`);
    process.exitCode = 1;
  })
  .finally(async () => {
    terminal.close();
    await prisma.$disconnect();
  });
