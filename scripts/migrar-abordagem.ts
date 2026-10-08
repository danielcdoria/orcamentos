// Passa a abordagem que estava escrita na Observação do cliente para o campo novo.
//   Observação "Mensagem antes"    -> abordagem = mensagem, observação apagada
//   Observação "Site pronto antes" -> abordagem = demo,     observação apagada
// Ignora maiúsculas, acentos, espaços e ponto final ("mensagem antes." também vale).
// Qualquer outro texto fica como está.
//
// Uso (na pasta do projeto):
//   npm run migrar-abordagem                       -> banco de testes, MODO TESTE (só mostra)
//   npm run migrar-abordagem -- --gravar           -> banco de testes, grava
//   npm run migrar-abordagem:producao              -> banco real, MODO TESTE (só mostra)
//   npm run migrar-abordagem:producao -- --gravar  -> banco real, grava
//
// Sem --gravar, nada é alterado. Rode primeiro sem, confira a lista, e só depois com.

import "dotenv/config";
import { prisma } from "@/lib/prisma";
import { normalizar } from "@/lib/busca";
import { ABORDAGEM } from "@/lib/prospeccao";
import type { Abordagem } from "@/generated/prisma/enums";

const gravar = process.argv.includes("--gravar");

const TEXTOS: Record<string, Abordagem> = {
  "mensagem antes": "mensagem",
  "site pronto antes": "demo",
};

function abordagemDoTexto(observacao: string): Abordagem | null {
  const limpo = normalizar(observacao).replace(/[.!]+$/, "").replace(/\s+/g, " ").trim();
  return TEXTOS[limpo] ?? null;
}

async function main() {
  console.log(gravar ? "\n=== GRAVANDO ===\n" : "\n=== MODO TESTE: nada será gravado ===\n");

  const clientes = await prisma.cliente.findMany({
    where: { observacao: { not: null } },
    orderBy: [{ empresaId: "asc" }, { nome: "asc" }],
    select: { id: true, nome: true, observacao: true, abordagem: true, empresa: { select: { nome: true } } },
  });

  const mudar: { id: string; abordagem: Abordagem; observacao: string }[] = [];
  const conflitos: string[] = [];
  const contagem: Record<Abordagem, number> = { mensagem: 0, demo: 0 };
  let empresaAtual = "";

  for (const c of clientes) {
    const abordagem = abordagemDoTexto(c.observacao!);
    if (!abordagem) continue; // outro texto: fica como está

    if (c.empresa.nome !== empresaAtual) {
      empresaAtual = c.empresa.nome;
      console.log(`\n${empresaAtual}`);
    }
    // Já tem outra abordagem gravada: não decide sozinho, só avisa.
    if (c.abordagem && c.abordagem !== abordagem) {
      conflitos.push(`${c.nome}: observação diz "${ABORDAGEM[abordagem]}", mas já está como "${ABORDAGEM[c.abordagem]}"`);
      console.log(`  ⚠️ ${c.nome}  ->  NÃO MEXE (já tem "${ABORDAGEM[c.abordagem]}")`);
      continue;
    }
    mudar.push({ id: c.id, abordagem, observacao: c.observacao! });
    contagem[abordagem]++;
    console.log(`  ${c.nome}  ->  ${ABORDAGEM[abordagem]}  (apaga a observação "${c.observacao}")`);
  }

  const outros = clientes.length - mudar.length - conflitos.length;
  console.log(`\nMudam: ${mudar.length} cliente(s): ${contagem.mensagem} "Mensagem antes", ${contagem.demo} "Site pronto antes".`);
  console.log(`Ficam como estão: ${outros} cliente(s) com outro texto na observação.`);
  if (conflitos.length) console.log(`Com aviso (não mexe): ${conflitos.length}. Confira à mão.`);

  if (mudar.length === 0) return console.log("\nNada a fazer.\n");
  if (!gravar) {
    console.log("\nMODO TESTE: nada foi gravado. Para gravar, rode de novo com  -- --gravar\n");
    return;
  }

  // A observação entra no filtro: se alguém editou o cliente nesse meio-tempo, não mexe.
  const resultados = await prisma.$transaction(
    mudar.map((m) =>
      prisma.cliente.updateMany({
        where: { id: m.id, observacao: m.observacao },
        data: { abordagem: m.abordagem, observacao: null },
      }),
    ),
  );
  const gravados = resultados.reduce((soma, r) => soma + r.count, 0);
  console.log(`\nPronto: ${gravados} cliente(s) com a abordagem no campo novo.\n`);
}

main()
  .catch((erro) => {
    console.error("\nErro:", erro instanceof Error ? erro.message : erro);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
