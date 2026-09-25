# Mapa do projeto

O que cada arquivo e pasta faz. Atualizado a cada parte construída.
Se algo der problema, procure aqui qual arquivo cuida daquilo.

## Configuração do projeto

| Arquivo / pasta | O que faz |
|---|---|
| `package.json` | Lista as bibliotecas usadas e os comandos (`npm run dev`, `npm run build`). Parecido com o `pom.xml` do Maven. O `postinstall` gera o código do Prisma sempre que alguém roda `npm install` (inclusive a Vercel). |
| `package-lock.json` | Registra a versão exata de cada biblioteca instalada. Gerado pelo npm, não se edita à mão. |
| `node_modules/` | Onde as bibliotecas ficam instaladas. Não vai para o git; `npm install` recria. |
| `tsconfig.json` | Configuração do TypeScript. |
| `next.config.ts` | Configuração do Next.js. Define a raiz do projeto (`turbopack.root`) porque existe um `package-lock.json` vazio em `~/` que confundia o Next. |
| `postcss.config.mjs` | Liga o Tailwind ao processo de build do CSS. |
| `eslint.config.mjs` | Regras do ESLint, que aponta erros e más práticas no código (`npm run lint`). |
| `next-env.d.ts` | Tipos do Next.js para o TypeScript. Gerado automaticamente. |
| `.gitignore` | O que o git deve ignorar (`node_modules`, `.env`, código gerado). |
| `.next/` | Arquivos temporários do Next.js. Pode apagar se algo ficar estranho; ele recria. |
| `AGENTS.md` / `CLAUDE.md` | Instruções para assistentes de IA que mexem no projeto. |
| `MAPA.md` | Este arquivo. |

## Banco de dados

| Arquivo / pasta | O que faz |
|---|---|
| `.env` | **Secreto.** Guarda os endereços do banco na Neon. Nunca vai para o git. `DATABASE_URL` (com pooler) é usada pelo site; `DIRECT_URL` (conexão direta) é usada pelas migrations. |
| `.env.example` | Modelo do `.env` sem senhas. Mostra quais variáveis o projeto precisa. Vai para o git. |
| `prisma.config.ts` | Diz ao Prisma onde está o schema, onde ficam as migrations e de onde vem o endereço do banco (usa `DIRECT_URL`). |
| `prisma/schema.prisma` | Descreve as tabelas do banco (como as `@Entity` do JPA): Empresa, Cliente, Item (catálogo), Orcamento e OrcamentoItem (linhas do orçamento). |
| `prisma/migrations/` | Histórico das mudanças no banco. Cada pasta é um `.sql` que o Prisma gerou e aplicou. **Não edite à mão.** |
| `src/generated/prisma/` | Código gerado pelo Prisma a partir do schema (`npx prisma generate`). Não vai para o git e não se edita. |
| `src/lib/prisma.ts` | Cria a conexão com o banco que o site inteiro usa. Todo acesso ao banco começa com `import { prisma } from "@/lib/prisma"`. |

## Regras e utilidades (`src/lib/`)

| Arquivo | O que faz |
|---|---|
| `src/lib/dinheiro.ts` | Funções de dinheiro: `formatarCentavos` (1250 → "R$ 12,50"), `lerReais` ("12,50" → 1250) e `calcularSubtotal` (quantidade × preço, arredondado). |

## Telas (`src/app/`)

No App Router, cada pasta dentro de `src/app` vira um endereço do site.
Exemplo: `src/app/clientes/page.tsx` → `/clientes`.

| Arquivo | O que faz |
|---|---|
| `src/app/layout.tsx` | Moldura comum a todas as páginas (`<html>`, fonte, título). |
| `src/app/page.tsx` | Página inicial (`/`). Ainda é a página de exemplo do Next.js. |
| `src/app/globals.css` | CSS global; é onde o Tailwind é carregado. |
| `src/app/favicon.ico` | Ícone da aba do navegador. |
| `public/` | Imagens e arquivos servidos direto pelo endereço (`/arquivo.svg`). |
