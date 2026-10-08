// TESTE DE VAZAMENTO ENTRE EMPRESAS
//
// Cria duas empresas de teste (A e B). Logado como A, tenta VER e ALTERAR coisas da B,
// do jeito que alguém mal-intencionado faria:
//   1. Páginas: abre pelo endereço o orçamento, o cliente e o item da B.
//   2. Listas: confere que nenhuma tela da A mostra dados da B.
//   3. Ações: faz uma ação real na A (mudar status, salvar cliente...), captura a chamada
//      que o navegador mandou ao servidor e REPETE a mesma chamada trocando o código do
//      registro da A pelo da B. Depois confere no banco que a B ficou intacta.
//   4-5. Página pública e PDF: não mostram custo, lucro nem margem.
//   6. Opções que o cliente escolhe (ação pública, sem login): só mexe no orçamento do link,
//      não aceita escolha inválida, não salva a "prévia" do dono e trava orçamento fechado.
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

  // Orçamento com opções: fixo 100 + grupo Material (padrão 1.000 | outra 2.000) + adicional 500.
  // Todos com custo "secreto" gravado, para conferir que ele não vaza.
  const linha = (descricao: string, subtotal: number, extra: object) => ({
    empresaId: e.id, descricao: `${descricao}-${letra}`, quantidade: "1", precoUnitario: subtotal, subtotal, custoUnitario: 424242, ...extra,
  });
  const comOpcoes = await prisma.orcamento.create({
    data: {
      empresaId: e.id,
      clienteId: cliente.id,
      numero: 3,
      total: 1100,
      validoAte: new Date(Date.now() + 15 * dia),
      status: "enviado",
      // 2 dias: entra em "Cobrar hoje", mas depois do orçamento nº 2 (3 dias), que os testes 3c/3d usam
      enviadoEm: new Date(Date.now() - 2 * dia),
      itens: {
        create: [
          linha("FIXO", 100, {}),
          linha("MDF-COMUM", 1000, { tipo: "opcao", grupo: "Material", padrao: true, incluido: true }),
          linha("MADEIRA-NOBRE", 2000, { tipo: "opcao", grupo: "Material", incluido: false }),
          linha("LED", 500, { tipo: "adicional", incluido: false }),
        ],
      },
    },
    include: { itens: { orderBy: { id: "asc" } } },
  });

  const token = randomBytes(32).toString("base64url");
  await prisma.sessao.create({
    data: {
      tokenHash: createHash("sha256").update(token).digest("hex"),
      usuarioId: e.usuario!.id,
      empresaId: e.id,
      expiraEm: new Date(Date.now() + 3_600_000),
    },
  });
  return { empresa: e, cliente, item, itemApagar, rascunho, enviado, comOpcoes, sessao: token };
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

// Texto de dentro do PDF. O arquivo guarda o texto compactado e picotado: cada linha vira
// pedaços em hexadecimal (<4d44...>) separados por ajustes de espaçamento entre letras.
// Aqui descompacta, junta os pedaços de cada linha e traduz para texto comum.
async function lerPdf(token: string) {
  const pdf = Buffer.from(await (await fetch(`${BASE}/orcamento/${token}/pdf`)).arrayBuffer());
  const { inflateSync } = await import("node:zlib");
  let bruto = pdf.toString("latin1");
  for (const m of bruto.matchAll(/stream\r?\n([\s\S]*?)endstream/g)) {
    try { bruto += inflateSync(Buffer.from(m[1], "latin1")).toString("latin1"); } catch { /* trecho não compactado */ }
  }
  const linhas = [...bruto.matchAll(/\[([^\]]*)\]\s*TJ/g)].map((m) =>
    [...m[1].matchAll(/<([0-9a-fA-F]*)>/g)].map((h) => Buffer.from(h[1], "hex").toString("latin1")).join(""),
  );
  const tudo = `${bruto}\n${linhas.join("\n")}\n${linhas.join("")}`.toLowerCase();
  return (t: string) => tudo.includes(t.toLowerCase());
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
  // As buscas por "SECRETO" e pelo nº 2 (que as duas empresas têm) só podem achar o que é da A.
  for (const caminho of ["/orcamentos", "/orcamentos?busca=SECRETO", "/orcamentos?busca=2&status=enviado", "/clientes", "/catalogo", "/catalogo?busca=SECRETO", "/orcamentos/novo", "/cobrar", "/painel", "/configuracoes"]) {
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
    // ?cliente= já deixa o cliente da A escolhido (como na volta do cadastro de cliente)
    await page.goto(`${BASE}/orcamentos/novo?cliente=${A.cliente.id}`, { waitUntil: "networkidle0" });
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

  // PDF: procura dentro do arquivo (descompactado)
  const noPdf = await lerPdf(A.rascunho.token);
  const achadosPdf = proibidos.filter(noPdf);
  registrar("PDF não tem custo/lucro/margem",
    noPdf("123,45") && achadosPdf.length === 0, // "123,45" (o preço) PRECISA aparecer: prova que a busca funciona
    achadosPdf.length ? `ACHOU: ${achadosPdf.join(", ")}` : noPdf("123,45") ? "preço encontrado, custo não" : "busca não achou nem o preço");

  // Orçamento com opções: a página e o PDF também não podem ter custo
  const pubOpcoes = await pagina("", `/orcamento/${A.comOpcoes.token}`);
  const achadosOpcoes = achar(pubOpcoes.corpo);
  registrar("Página pública COM OPÇÕES não mostra custo/lucro/margem",
    pubOpcoes.status === 200 && pubOpcoes.corpo.includes("Escolha uma opção") && pubOpcoes.corpo.includes("MADEIRA-NOBRE-A") && achadosOpcoes.length === 0,
    achadosOpcoes.length ? `ACHOU: ${achadosOpcoes.join(", ")}` : `HTTP ${pubOpcoes.status}`);
  const noPdfOpcoes = await lerPdf(A.comOpcoes.token);
  const achadosPdfOpcoes = proibidos.filter(noPdfOpcoes);
  registrar("PDF COM OPÇÕES não tem custo/lucro/margem",
    noPdfOpcoes("MADEIRA-NOBRE-A") && achadosPdfOpcoes.length === 0,
    achadosPdfOpcoes.length ? `ACHOU: ${achadosPdfOpcoes.join(", ")}` : "");

  // 6) OPÇÕES QUE O CLIENTE ESCOLHE: a ação pública (sem login)
  const [fixoA, comumA, nobreA, ledA] = A.comOpcoes.itens;
  const nobreB = B.comOpcoes.itens[2];
  const estado = async (id: string) => {
    const o = await prisma.orcamento.findUniqueOrThrow({
      where: { id },
      include: { itens: { orderBy: { id: "asc" } }, _count: { select: { escolhas: true } } },
    });
    return { total: o.total, incluidos: o.itens.filter((i) => i.incluido).map((i) => i.id).join(","), escolhas: o._count.escolhas };
  };
  const browser2 = await puppeteer.launch({ executablePath: CHROME, headless: true });
  try {
    // 6a) cliente final (sem login) escolhe "madeira nobre" e marca o LED na página
    const cliente = await browser2.newPage();
    await cliente.goto(`${BASE}/orcamento/${A.comOpcoes.token}`, { waitUntil: "networkidle0" });
    const marcar = (texto: string) =>
      cliente.evaluate((t) => {
        const label = [...document.querySelectorAll("label")].find((l) => l.textContent?.includes(t));
        label?.querySelector("input")?.click();
      }, texto);
    const acaoEscolha = await capturarAcao(cliente, async () => {
      await marcar("MADEIRA-NOBRE-A");
      await marcar("LED-A");
    });
    await cliente.waitForFunction(() => document.body.textContent?.includes("Sua escolha foi salva"), { timeout: 5000 });
    let a = await estado(A.comOpcoes.id);
    registrar("Cliente escolhe na página: escolha e total salvos",
      a.total === 100 + 2000 + 500 && a.incluidos === [fixoA.id, nobreA.id, ledA.id].join(",") && a.escolhas >= 1,
      `total ${a.total}, trocas registradas ${a.escolhas}`);

    // Repete a chamada da ação com outros dados (como faria um atacante)
    const chamar = (token: string, marcados: string[]) =>
      cliente.evaluate(
        async ({ url, headers, corpo }) => (await fetch(url, { method: "POST", headers, body: corpo })).status,
        {
          url: acaoEscolha.url,
          headers: Object.fromEntries(Object.entries(acaoEscolha.headers).filter(([k]) => !["content-length", "cookie", "host", "origin", "referer"].includes(k))),
          corpo: JSON.stringify([token, marcados]),
        },
      );
    const antesB = await estado(B.comOpcoes.id);

    // 6b) usa o link da A mas manda itens da B
    await chamar(A.comOpcoes.token, [nobreB.id]);
    // 6c) usa o link da B com itens da A
    await chamar(B.comOpcoes.token, [comumA.id]);
    // 6d) duas opções do mesmo grupo ao mesmo tempo, e tentar tirar o item fixo
    await chamar(A.comOpcoes.token, [comumA.id, nobreA.id]);
    await chamar(A.comOpcoes.token, [comumA.id]); // (o fixo não vem na lista: tem que continuar incluído)
    a = await estado(A.comOpcoes.id);
    const b = await estado(B.comOpcoes.id);
    registrar("Escolha com itens de outro orçamento/empresa é recusada",
      b.incluidos === antesB.incluidos && b.total === antesB.total && b.escolhas === 0,
      `B: total ${b.total}, trocas ${b.escolhas}`);
    registrar("Escolha inválida (2 opções no grupo) recusada e item fixo não sai",
      a.incluidos.split(",").includes(fixoA.id) && a.incluidos === [fixoA.id, comumA.id].join(",") && a.total === 1100,
      `A: total ${a.total} (esperado 1100 depois da última escolha válida)`);

    // 6e) o dono logado conferindo ("Ver como o cliente vê"): mexe, mas NÃO salva
    const dono = await browser2.createBrowserContext();
    const pDono = await dono.newPage();
    await dono.setCookie({ name: "sessao", value: A.sessao, domain: new URL(BASE).hostname, path: "/" });
    await pDono.goto(`${BASE}/orcamento/${A.comOpcoes.token}`, { waitUntil: "networkidle0" });
    const antesDono = await estado(A.comOpcoes.id);
    await pDono.evaluate(() => {
      const label = [...document.querySelectorAll("label")].find((l) => l.textContent?.includes("MADEIRA-NOBRE-A"));
      label?.querySelector("input")?.click();
    });
    await new Promise((r) => setTimeout(r, 2500));
    const depoisDono = await estado(A.comOpcoes.id);
    const avisoPrevia = await pDono.evaluate(() => document.body.textContent?.includes("não é salvo") ?? false);
    registrar("Prévia do dono logado não salva escolha",
      depoisDono.incluidos === antesDono.incluidos && depoisDono.escolhas === antesDono.escolhas && avisoPrevia);

    // 6f) sinal na cobrança: a A vê "Mexeu nas opções" no Cobrar hoje (a B não vê nada da A)
    const cobrarA = await pagina(A.sessao, "/cobrar");
    registrar("Cobrar hoje mostra o sinal “Mexeu nas opções”", cobrarA.corpo.includes("Mexeu nas opções"));

    // 6g) orçamento fechado: a escolha fica travada
    await prisma.orcamento.update({ where: { id: A.comOpcoes.id }, data: { status: "fechado" } });
    const antesFechado = await estado(A.comOpcoes.id);
    await chamar(A.comOpcoes.token, [nobreA.id]);
    const depoisFechado = await estado(A.comOpcoes.id);
    registrar("Orçamento fechado não aceita troca de opção", depoisFechado.incluidos === antesFechado.incluidos);
  } finally {
    await browser2.close();
  }

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
