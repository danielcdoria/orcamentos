// MOTOR DOS DADOS DE DEMONSTRAÇÃO
// Cria (ou recria) uma empresa fictícia completa: logo, catálogo, clientes e orçamentos
// espalhados pelos últimos dias, com exatamente 3 em "Cobrar hoje" (prazos padrão 2/7/15).
// Os DADOS de cada empresa ficam em scripts/demo-*.ts; este arquivo só faz o trabalho.
// Apaga apenas a empresa do mesmo email de login antes de recriar.

import "dotenv/config";
import { readFileSync } from "node:fs";
import { createInterface } from "node:readline";
import { prisma } from "@/lib/prisma";
import { gerarHashSenha } from "@/lib/senha";
import { calcularSubtotal } from "@/lib/dinheiro";
import { resumoEscolha, somarIncluidos } from "@/lib/opcoes";
import { telefoneParaWhatsApp } from "@/lib/telefone";
import type { StatusOrcamento } from "@/generated/prisma/enums";

// Item de opção: { grupo: "Material" } (padrao: true na que já vem escolhida) ou "adicional"
export type OpcaoDemo = { grupo: string; padrao?: true } | "adicional";

export type Plano = {
  cliente: string;
  dias: number;
  status: StatusOrcamento;
  abriu?: number; // aberto há quantos dias (e quantas vezes: ver vezes)
  vezes?: number;
  cobrancas?: [etapa: 1 | 2, diasAtras: number][];
  itens: [descricao: string, quantidade: number, opcao?: OpcaoDemo][];
  obs?: string;
  // o que o cliente escolheu na página, em ordem: quando e quais opções/adicionais marcou
  escolhas?: [diasAtras: number, hora: number, minuto: number, marcados: string[]][];
};
export type ConfigDemo = {
  nome: string;
  email: string; // login da demonstração
  telefone: string;
  condicaoPagamento: string;
  diasValidade: number;
  mensagemEnvio: string;
  logo: string; // caminho do PNG do logo
  catalogo: [descricao: string, precoCentavos: number, unidade: string][];
  clientes: [nome: string, telefone: string, observacao: string][];
  planos: Plano[]; // os orçamentos; "dias" = há quantos dias foi enviado
  clientesCobrarHoje: string[]; // recebem o seu celular, se você informar
};

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

async function apagarDemoAnterior(c: ConfigDemo) {
  const usuario = await prisma.usuario.findUnique({ where: { email: c.email } });
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
  console.log(`${c.nome} anterior apagada.`);
}

export async function rodarDemo(c: ConfigDemo) {
  const CATALOGO = c.catalogo, CLIENTES = c.clientes, PLANOS = c.planos, CLIENTES_COBRAR_HOJE = c.clientesCobrarHoje;
  console.log(`\n=== Dados de demonstração: ${c.nome} ===\n`);
  const senha = await perguntar("Senha para o login da demonstração (mínimo 8 caracteres): ");
  if (senha.length < 8) throw new Error("A senha precisa ter pelo menos 8 caracteres.");
  const meuCelular = await perguntar(
    "Seu celular (opcional; Enter para pular). Se informar, os 3 clientes de 'Cobrar hoje'\n" +
      "usam esse número, para você testar o envio mandando para você mesmo: ",
  );
  if (meuCelular && !telefoneParaWhatsApp(meuCelular)) throw new Error("Celular inválido. Use DDD + número.");

  await apagarDemoAnterior(c);

  const empresa = await prisma.empresa.create({
    data: {
      nome: c.nome,
      telefone: c.telefone,
      condicaoPagamento: c.condicaoPagamento,
      diasValidade: c.diasValidade,
      mensagemEnvio: c.mensagemEnvio,
      criadoEm: diasAtras(40),
      usuario: { create: { email: c.email, senhaHash: await gerarHashSenha(senha) } },
    },
  });
  const e = empresa.id;

  const logo = readFileSync(c.logo);
  await prisma.empresaLogo.create({ data: { empresaId: e, dados: new Uint8Array(logo), tipo: "image/png" } });
  await prisma.empresa.update({ where: { id: e }, data: { logoUrl: `/logo/${e}?v=${Date.now()}` } });

  const itens = new Map<string, { preco: number; unidade: string }>();
  for (const [descricao, preco, unidade] of CATALOGO) {
    await prisma.item.create({ data: { empresaId: e, descricao, preco, unidade } });
    itens.set(descricao, { preco, unidade });
  }

  const clientes = new Map<string, string>();
  for (const [i, [nome, telefone, observacao]] of CLIENTES.entries()) {
    const tel = meuCelular && CLIENTES_COBRAR_HOJE.includes(nome) ? meuCelular : telefone;
    const c = await prisma.cliente.create({
      data: { empresaId: e, nome, telefone: tel, observacao, criadoEm: diasAtras(35 - i * 2) },
    });
    clientes.set(nome, c.id);
  }

  // Numera na ordem em que foram criados (mais antigo = nº 1), e dá horários crescentes
  // para os orçamentos do mesmo dia.
  const ordenados = [...PLANOS].sort((a, b) => b.dias - a.dias);
  const porDia = new Map<number, number>();

  for (const [i, p] of ordenados.entries()) {
    const linhas = p.itens.map(([descricao, quantidade, opcao]) => {
      const item = itens.get(descricao);
      if (!item) throw new Error(`Item não está no catálogo: ${descricao}`);
      const tipo = !opcao ? "fixo" : opcao === "adicional" ? "adicional" : "opcao";
      const padrao = typeof opcao === "object" && opcao.padrao === true;
      return {
        empresaId: e,
        descricao,
        quantidade: String(quantidade),
        precoUnitario: item.preco,
        subtotal: calcularSubtotal(quantidade, item.preco),
        tipo,
        grupo: typeof opcao === "object" ? opcao.grupo : null,
        padrao,
        incluido: tipo === "fixo" || padrao,
      } as const;
    });

    // Escolhas do cliente na página pública: cada uma vira uma linha do histórico, e a
    // última é a que vale agora (itens marcados e total).
    const escolhas = (p.escolhas ?? []).map(([d, hora, minuto, marcados]) => {
      const estado = linhas.map((l) => ({ ...l, incluido: l.tipo === "fixo" || marcados.includes(l.descricao) }));
      return { estado, resumo: resumoEscolha(estado), total: somarIncluidos(estado), criadaEm: diasAtras(d, hora, minuto) };
    });
    const final = escolhas.at(-1)?.estado ?? linhas;
    const total = somarIncluidos(final);
    const k = porDia.get(p.dias) ?? 0; // quantos já foram criados neste mesmo dia
    porDia.set(p.dias, k + 1);
    const criadoEm =
      p.dias === 0
        ? new Date(Date.now() - (150 - 45 * k) * 60_000) // hoje: há 2h30, há 1h45...
        : diasAtras(p.dias, 9 + 2 * k, (i * 7) % 60);
    const validoAte = new Date(criadoEm.getTime() + c.diasValidade * 86_400_000);
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
        itens: { create: final },
        escolhas: {
          create: escolhas.map((x) => ({ empresaId: e, resumo: x.resumo, total: x.total, criadaEm: x.criadaEm })),
        },
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

  console.log(`\nPronto! ${c.nome} criada: ${CLIENTES.length} clientes, ${CATALOGO.length} itens, ${PLANOS.length} orçamentos.`);
  console.log(`Login: ${c.email} (com a senha que você digitou)`);
  console.log("Dica: limpe o terminal (Cmd + K) para a senha não ficar na tela.\n");
}


// Roda a demonstração e fecha as conexões no final (com mensagem de erro amigável).
export function executar(c: ConfigDemo) {
  rodarDemo(c)
    .catch((erro) => {
      console.error(`\nErro: ${erro.message}\n`);
      process.exitCode = 1;
    })
    .finally(async () => {
      terminal.close();
      await prisma.$disconnect();
    });
}
