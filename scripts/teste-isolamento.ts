// TESTE DE VAZAMENTO ENTRE EMPRESAS
//
// Cria duas empresas de teste (A e B). Logado como A, tenta VER e ALTERAR coisas da B,
// do jeito que alguém mal-intencionado faria:
//   1. Páginas: abre pelo endereço o orçamento, o cliente e o item da B.
//   2. Listas: confere que nenhuma tela da A mostra dados da B.
//   3. Ações: faz uma ação real na A (mudar status, salvar cliente...), captura a chamada
//      que o navegador mandou ao servidor e REPETE a mesma chamada trocando o código do
//      registro da A pelo da B. Depois confere no banco que a B ficou intacta.
// No fim, apaga as duas empresas de teste.
//
// Uso: com o "npm run dev" ligado, em outro terminal:  npm run teste:isolamento
// Roda no banco do .env (testes). Precisa do Google Chrome instalado.

import "dotenv/config";
import { createHash, randomBytes } from "node:crypto";
import puppeteer, { type HTTPRequest, type Page } from "puppeteer-core";
import { prisma } from "@/lib/prisma";

const BASE = process.env.TESTE_URL ?? "http://localhost:3000";
const CHROME = process.env.CHROME_PATH ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PREFIXO = "TESTE-ISOLAMENTO";

type Resultado = { teste: string; ok: boolean; detalhe?: string };
const resultados: Resultado[] = [];
function registrar(teste: string, ok: boolean, detalhe?: string) {
  resultados.push({ teste, ok, detalhe });
  console.log(`${ok ? "✅" : "❌"} ${teste}${detalhe ? `  (${detalhe})` : ""}`);
}

// ---------- preparação ----------

async function apagarEmpresasDeTeste() {
  const empresas = await prisma.empresa.findMany({ where: { nome: { startsWith: PREFIXO } }, select: { id: true } });
  const ids = empresas.map((e) => e.id);
  if (ids.length === 0) return;
  const noIds = { empresaId: { in: ids } };
  await prisma.$transaction([
    prisma.cobranca.deleteMany({ where: noIds }),
    prisma.orcamentoItem.deleteMany({ where: noIds }),
    prisma.orcamento.deleteMany({ where: noIds }),
    prisma.cliente.deleteMany({ where: noIds }),
    prisma.item.deleteMany({ where: noIds }),
    prisma.sessao.deleteMany({ where: noIds }),
    prisma.usuario.deleteMany({ where: noIds }),
    prisma.empresaLogo.deleteMany({ where: noIds }),
    prisma.empresa.deleteMany({ where: { id: { in: ids } } }),
  ]);
}

async function criarEmpresa(letra: "A" | "B") {
  const dia = 86_400_000;
  const e = await prisma.empresa.create({
    data: {
      nome: `${PREFIXO}-${letra}`,
      usuario: { create: { email: `teste-isolamento-${letra.toLowerCase()}@exemplo.com`, senhaHash: "x:y" } },
    },
    include: { usuario: true },
  });
  const cliente = await prisma.cliente.create({
    data: { empresaId: e.id, nome: `CLIENTE-SECRETO-${letra}`, telefone: "21999990000" },
  });
  const item = await prisma.item.create({
    data: { empresaId: e.id, descricao: `ITEM-SECRETO-${letra}`, preco: 12345, unidade: "un" },
  });
  const itemApagar = await prisma.item.create({
    data: { empresaId: e.id, descricao: `ITEM-APAGAR-${letra}`, preco: 100, unidade: "un" },
  });
  const orcamento = (numero: number, enviadoHaDias: number | null) =>
    prisma.orcamento.create({
      data: {
        empresaId: e.id,
        clienteId: cliente.id,
        numero,
        total: 12345,
        validoAte: new Date(Date.now() + 15 * dia),
        status: enviadoHaDias === null ? "rascunho" : "enviado",
        enviadoEm: enviadoHaDias === null ? null : new Date(Date.now() - enviadoHaDias * dia),
        itens: { create: [{ empresaId: e.id, descricao: `ITEM-SECRETO-${letra}`, quantidade: "1", precoUnitario: 12345, subtotal: 12345 }] },
      },
    });
  const rascunho = await orcamento(1, null);
  const enviado = await orcamento(2, 3); // enviado há 3 dias: aparece em "Cobrar hoje"

  const token = randomBytes(32).toString("base64url");
  await prisma.sessao.create({
    data: {
      tokenHash: createHash("sha256").update(token).digest("hex"),
      usuarioId: e.usuario!.id,
      empresaId: e.id,
      expiraEm: new Date(Date.now() + 3_600_000),
    },
  });
  return { empresa: e, cliente, item, itemApagar, rascunho, enviado, sessao: token };
}

// ---------- ferramentas ----------

async function pagina(sessao: string, caminho: string) {
  const r = await fetch(BASE + caminho, { headers: { Cookie: `sessao=${sessao}`, "User-Agent": "teste-isolamento" }, redirect: "manual" });
  return { status: r.status, corpo: await r.text() };
}

// Executa uma ação na tela e captura a chamada que o navegador mandou ao servidor.
async function capturarAcao(page: Page, fazer: () => Promise<unknown>) {
  let capturada: { url: string; headers: Record<string, string>; corpo: string } | null = null;
  const ouvinte = (req: HTTPRequest) => {
    if (req.method() === "POST" && req.headers()["next-action"] && !capturada) {
      capturada = { url: req.url(), headers: req.headers(), corpo: req.postData() ?? "" };
    }
  };
  page.on("request", ouvinte);
  await fazer();
  for (let i = 0; i < 40 && !capturada; i++) await new Promise((r) => setTimeout(r, 100));
  await new Promise((r) => setTimeout(r, 1200)); // deixa a ação terminar
  page.off("request", ouvinte);
  if (!capturada) throw new Error("não consegui capturar a chamada da ação");
  return capturada as { url: string; headers: Record<string, string>; corpo: string };
}

// Repete a chamada capturada trocando o código do registro da A pelo da B (o ataque).
async function repetirComOutroId(page: Page, acao: { url: string; headers: Record<string, string>; corpo: string }, idA: string, idB: string) {
  if (!acao.corpo.includes(idA)) throw new Error("a chamada capturada não contém o código esperado");
  const corpo = acao.corpo.split(idA).join(idB);
  const headers = Object.fromEntries(
    Object.entries(acao.headers).filter(([k]) => !["content-length", "cookie", "host", "origin", "referer"].includes(k)),
  );
  return page.evaluate(
    async ({ url, headers, corpo }) => (await fetch(url, { method: "POST", headers, body: corpo })).status,
    { url: acao.url, headers, corpo },
  );
}

// ---------- os testes ----------

async function main() {
  console.log(`\nTeste de vazamento entre empresas (${BASE})\n`);
  await apagarEmpresasDeTeste();
  const A = await criarEmpresa("A");
  const B = await criarEmpresa("B");

  // 1) Páginas da B abertas pelo endereço, logado como A
  for (const [nome, caminho] of [
    ["orçamento", `/orcamentos/${B.rascunho.id}`],
    ["cliente", `/clientes/${B.cliente.id}`],
    ["item do catálogo", `/catalogo/${B.item.id}`],
  ] as const) {
    const r = await pagina(A.sessao, caminho);
    const vazou = r.corpo.includes("SECRETO-B");
    registrar(`A abre pelo endereço o ${nome} da B`, r.status === 404 && !vazou, `HTTP ${r.status}`);
  }

  // 2) Nenhuma tela da A mostra dados da B
  for (const caminho of ["/orcamentos", "/clientes", "/catalogo", "/catalogo?busca=SECRETO", "/orcamentos/novo", "/cobrar", "/painel", "/configuracoes"]) {
    const r = await pagina(A.sessao, caminho);
    const mostraA = caminho === "/painel" || caminho === "/configuracoes" || r.corpo.includes("SECRETO-A");
    registrar(`Tela ${caminho} da A não mostra nada da B`, r.status === 200 && !r.corpo.includes("SECRETO-B") && mostraA, `HTTP ${r.status}`);
  }

  // 3) Ações: capturar a chamada real na A e repetir contra a B
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: true });
  try {
    const page = await browser.newPage();
    await page.setUserAgent("teste-isolamento");
    await browser.setCookie({ name: "sessao", value: A.sessao, domain: new URL(BASE).hostname, path: "/" });
    // impede o navegador de abrir o WhatsApp de verdade
    await page.evaluateOnNewDocument(() => {
      document.addEventListener("click", (e) => {
        if ((e.target as Element)?.closest?.('a[href^="https://wa.me"]')) e.preventDefault();
      }, true);
      window.confirm = () => true;
    });

    // 3a) mudar status
    await page.goto(`${BASE}/orcamentos/${A.rascunho.id}`, { waitUntil: "networkidle0" });
    let acao = await capturarAcao(page, () => page.select('select[aria-label="Status do orçamento"]', "fechado"));
    await repetirComOutroId(page, acao, A.rascunho.id, B.rascunho.id);
    let bOrc = await prisma.orcamento.findUniqueOrThrow({ where: { id: B.rascunho.id } });
    registrar("A tenta mudar o status de um orçamento da B", bOrc.status === "rascunho", `status da B: ${bOrc.status}`);

    // 3b) marcar como enviado (botão Enviar no WhatsApp)
    await page.goto(`${BASE}/orcamentos/${A.rascunho.id}`, { waitUntil: "networkidle0" });
    acao = await capturarAcao(page, () => page.click('a[href^="https://wa.me"]'));
    await repetirComOutroId(page, acao, A.rascunho.id, B.rascunho.id);
    bOrc = await prisma.orcamento.findUniqueOrThrow({ where: { id: B.rascunho.id } });
    registrar("A tenta marcar como enviado um orçamento da B", bOrc.enviadoEm === null && bOrc.status === "rascunho");

    // 3c) registrar cobrança
    await page.goto(`${BASE}/cobrar`, { waitUntil: "networkidle0" });
    acao = await capturarAcao(page, () => page.click('a[href^="https://wa.me"]'));
    await repetirComOutroId(page, acao, A.enviado.id, B.enviado.id);
    const cobrancasB = await prisma.cobranca.count({ where: { orcamentoId: B.enviado.id } });
    registrar("A tenta registrar cobrança num orçamento da B", cobrancasB === 0, `cobranças na B: ${cobrancasB}`);

    // 3d) marcar como respondido (na fila de cobrança) — usa um orçamento novo da A, já que o anterior saiu da fila
    await prisma.cobranca.deleteMany({ where: { orcamentoId: A.enviado.id } });
    await page.goto(`${BASE}/cobrar`, { waitUntil: "networkidle0" });
    acao = await capturarAcao(page, async () => {
      const botoes = await page.$$("button");
      for (const b of botoes) if ((await b.evaluate((x) => x.textContent)).includes("já respondeu")) return b.click();
    });
    await repetirComOutroId(page, acao, A.enviado.id, B.enviado.id);
    const bEnviado = await prisma.orcamento.findUniqueOrThrow({ where: { id: B.enviado.id } });
    registrar("A tenta marcar como respondido um orçamento da B", bEnviado.status === "enviado", `status da B: ${bEnviado.status}`);

    // 3e) editar cliente
    await page.goto(`${BASE}/clientes/${A.cliente.id}`, { waitUntil: "networkidle0" });
    await page.$eval('input[name="nome"]', (el) => ((el as HTMLInputElement).value = "NOME-TROCADO-PELA-A"));
    acao = await capturarAcao(page, () => page.click('button[type="submit"]'));
    await repetirComOutroId(page, acao, A.cliente.id, B.cliente.id);
    const bCliente = await prisma.cliente.findUniqueOrThrow({ where: { id: B.cliente.id } });
    registrar("A tenta editar um cliente da B", bCliente.nome === "CLIENTE-SECRETO-B", `nome do cliente da B: ${bCliente.nome}`);

    // 3f) editar item do catálogo
    await page.goto(`${BASE}/catalogo/${A.item.id}`, { waitUntil: "networkidle0" });
    await page.$eval('input[name="preco"]', (el) => ((el as HTMLInputElement).value = "1,00"));
    acao = await capturarAcao(page, () => page.click('button[type="submit"]'));
    await repetirComOutroId(page, acao, A.item.id, B.item.id);
    const bItem = await prisma.item.findUniqueOrThrow({ where: { id: B.item.id } });
    registrar("A tenta mudar o preço de um item da B", bItem.preco === 12345, `preço da B: ${bItem.preco}`);

    // 3g) apagar item do catálogo
    await page.goto(`${BASE}/catalogo/${A.itemApagar.id}`, { waitUntil: "networkidle0" });
    acao = await capturarAcao(page, async () => {
      const botoes = await page.$$("button");
      for (const b of botoes) if ((await b.evaluate((x) => x.textContent)).includes("Apagar")) return b.click();
    });
    await repetirComOutroId(page, acao, A.itemApagar.id, B.itemApagar.id);
    const bItemExiste = await prisma.item.count({ where: { id: B.itemApagar.id } });
    registrar("A tenta apagar um item da B", bItemExiste === 1);

    // 3h) criar orçamento para um cliente da B
    await page.goto(`${BASE}/orcamentos/novo`, { waitUntil: "networkidle0" });
    await page.select("#cliente", A.cliente.id);
    await page.type("#busca", "SECRETO");
    await page.waitForFunction(() => [...document.querySelectorAll("button")].some((b) => b.textContent?.includes("ITEM-SECRETO-A")));
    await page.evaluate(() => ([...document.querySelectorAll("button")].find((b) => b.textContent?.includes("ITEM-SECRETO-A")) as HTMLButtonElement).click());
    acao = await capturarAcao(page, async () => {
      const botoes = await page.$$("button");
      for (const b of botoes) if ((await b.evaluate((x) => x.textContent)).includes("Salvar orçamento")) return b.click();
    });
    const antes = await prisma.orcamento.count({ where: { clienteId: B.cliente.id } });
    await repetirComOutroId(page, acao, A.cliente.id, B.cliente.id);
    const depois = await prisma.orcamento.count({ where: { clienteId: B.cliente.id } });
    registrar("A tenta criar orçamento para um cliente da B", depois === antes, `orçamentos do cliente da B: ${antes} → ${depois}`);
  } finally {
    await browser.close();
  }

  // 4) Página pública: sem o código secreto, nada
  const r = await pagina("", `/orcamento/${"0".repeat(64)}`);
  registrar("Link público com código inventado", r.status === 404, `HTTP ${r.status}`);

  // 5) PRIVACIDADE DO CUSTO: custo, lucro e margem nunca chegam ao cliente final.
  //    Grava um custo fácil de reconhecer (R$ 4.242,42) e procura na página pública e no PDF.
  await prisma.orcamentoItem.updateMany({ where: { orcamentoId: A.rascunho.id }, data: { custoUnitario: 424242 } });
  await prisma.item.update({ where: { id: A.item.id }, data: { custo: 313131 } });
  const proibidos = ["424242", "4.242,42", "4242,42", "313131", "3.131,31", "custo", "lucro", "margem"];
  const achar = (texto: string) => proibidos.filter((p) => texto.toLowerCase().includes(p.toLowerCase()));

  for (const [quem, sessao] of [["cliente final", ""], ["dono logado (Ver como o cliente vê)", A.sessao]] as const) {
    const pub = await pagina(sessao, `/orcamento/${A.rascunho.token}`);
    const achados = achar(pub.corpo);
    registrar(`Página pública não mostra custo/lucro/margem, vista pelo ${quem}`,
      pub.status === 200 && pub.corpo.includes("123,45") && achados.length === 0,
      achados.length ? `ACHOU: ${achados.join(", ")}` : `HTTP ${pub.status}`);
  }

  // PDF: descompacta os trechos internos do arquivo e procura em texto e em hexadecimal
  const pdf = Buffer.from(await (await fetch(`${BASE}/orcamento/${A.rascunho.token}/pdf`)).arrayBuffer());
  const { inflateSync } = await import("node:zlib");
  let conteudo = pdf.toString("latin1");
  for (const m of conteudo.matchAll(/stream\r?\n([\s\S]*?)endstream/g)) {
    try { conteudo += inflateSync(Buffer.from(m[1], "latin1")).toString("latin1"); } catch { /* trecho não compactado */ }
  }
  const hex = (t: string) => Buffer.from(t, "latin1").toString("hex");
  const noPdf = (t: string) => conteudo.includes(t) || conteudo.toLowerCase().includes(hex(t));
  const achadosPdf = proibidos.filter(noPdf);
  registrar("PDF não tem custo/lucro/margem",
    noPdf("123,45") && achadosPdf.length === 0, // "123,45" (o preço) PRECISA aparecer: prova que a busca funciona
    achadosPdf.length ? `ACHOU: ${achadosPdf.join(", ")}` : noPdf("123,45") ? "preço encontrado, custo não" : "busca não achou nem o preço");

  await apagarEmpresasDeTeste();
  const falhas = resultados.filter((x) => !x.ok).length;
  console.log(`\n${resultados.length - falhas} de ${resultados.length} testes passaram.${falhas ? " ❌ ATENÇÃO: há vazamento!" : " Nenhum vazamento encontrado."}\n`);
  process.exitCode = falhas ? 1 : 0;
}

main()
  .catch(async (erro) => {
    console.error("\nO teste parou com erro:", erro.message);
    await apagarEmpresasDeTeste().catch(() => {});
    process.exitCode = 2;
  })
  .finally(() => prisma.$disconnect());
