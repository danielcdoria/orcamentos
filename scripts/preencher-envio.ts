// Corrige orçamentos marcados como "Enviado" pela pílula antes da correção de alterarStatus:
// eles ficaram sem enviadoEm e por isso nunca entravam em "Cobrar hoje".
// Preenche enviadoEm com a data de criação do orçamento. Nunca mexe num enviadoEm que já existe.
//
// Uso (na pasta do projeto):
//   npm run preencher-envio                       -> banco de testes, MODO TESTE (só mostra)
//   npm run preencher-envio -- --gravar           -> banco de testes, grava
//   npm run preencher-envio:producao              -> banco real, MODO TESTE (só mostra)
//   npm run preencher-envio:producao -- --gravar  -> banco real, grava
//
// Sem --gravar, nada é alterado. Rode primeiro sem, confira a lista, e só depois com.

import "dotenv/config";
import { prisma } from "@/lib/prisma";
import { diasDesde } from "@/lib/cobranca";
import { formatarData } from "@/lib/formatos";

const gravar = process.argv.includes("--gravar");

async function main() {
  console.log(gravar ? "\n=== GRAVANDO ===\n" : "\n=== MODO TESTE: nada será gravado ===\n");

  const orcamentos = await prisma.orcamento.findMany({
    where: { status: "enviado", enviadoEm: null },
    orderBy: [{ empresaId: "asc" }, { numero: "asc" }],
    select: {
      id: true,
      numero: true,
      criadoEm: true,
      cliente: { select: { nome: true } },
      empresa: { select: { nome: true, prazoCobranca1: true } },
    },
  });

  if (orcamentos.length === 0) {
    console.log("Nenhum orçamento Enviado sem data de envio. Nada a fazer.");
    return;
  }

  // O que acontece com cada um depois de ganhar a data, pela regra de cobrança. Nenhum vira
  // Perdido por isso: o prazo de perdido só conta depois da cobrança ("Já cobrei").
  const efeito = { cobrar: 0, esperando: 0 };
  let empresaAtual = "";
  for (const o of orcamentos) {
    if (o.empresa.nome !== empresaAtual) {
      empresaAtual = o.empresa.nome;
      const p = o.empresa;
      console.log(`\n${empresaAtual}  (entra em "Cobrar hoje" ${p.prazoCobranca1} dias depois do envio)`);
    }
    const dias = diasDesde(o.criadoEm);
    let aviso = "ainda não é hora de cobrar";
    if (dias >= o.empresa.prazoCobranca1) {
      aviso = "entra em Cobrar hoje";
      efeito.cobrar++;
    } else {
      efeito.esperando++;
    }
    console.log(`  nº ${o.numero}  ${o.cliente.nome}  ->  enviado em ${formatarData(o.criadoEm)} (${dias} dias)  ${aviso}`);
  }

  console.log(`\nTotal: ${orcamentos.length} orçamento(s).`);
  console.log(`  ${efeito.cobrar} entram em "Cobrar hoje"`);
  console.log(`  ${efeito.esperando} ainda vão esperar o prazo da cobrança`);

  if (!gravar) {
    console.log("\nMODO TESTE: nada foi gravado. Para gravar, rode de novo com  -- --gravar\n");
    return;
  }

  // Um por um, com enviadoEm: null no filtro: se algum ganhou data nesse meio-tempo, não mexe.
  const resultados = await prisma.$transaction(
    orcamentos.map((o) =>
      prisma.orcamento.updateMany({
        where: { id: o.id, status: "enviado", enviadoEm: null },
        data: { enviadoEm: o.criadoEm },
      }),
    ),
  );
  const gravados = resultados.reduce((soma, r) => soma + r.count, 0);
  console.log(`\nPronto: ${gravados} orçamento(s) com data de envio preenchida.\n`);
}

main()
  .catch((erro) => {
    console.error("\nErro:", erro instanceof Error ? erro.message : erro);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
