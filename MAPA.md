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
| `prisma/schema.prisma` | Descreve as tabelas do banco (como as `@Entity` do JPA): Empresa, Usuario (login), Sessao (logins abertos), Cliente, Item (catálogo), Orcamento e OrcamentoItem (linhas do orçamento). |
| `prisma/migrations/` | Histórico das mudanças no banco. Cada pasta é um `.sql` que o Prisma gerou e aplicou. **Não edite à mão.** |
| `src/generated/prisma/` | Código gerado pelo Prisma a partir do schema (`npx prisma generate`). Não vai para o git e não se edita. |
| `src/lib/prisma.ts` | Cria a conexão com o banco que o site inteiro usa. Todo acesso ao banco começa com `import { prisma } from "@/lib/prisma"`. |

## Regras e utilidades (`src/lib/`)

| Arquivo | O que faz |
|---|---|
| `src/lib/auth.ts` | **Porta de entrada.** `exigirSessao()` confere o login e devolve o `empresaId`. Toda página interna e toda ação que grava dados deve chamar essa função e usar o `empresaId` dela nas consultas. |
| `src/lib/sessao.ts` | Cria, lê e apaga a sessão (o cookie `sessao` + a linha na tabela Sessao). Login dura 30 dias. |
| `src/lib/senha.ts` | Embaralha a senha (hash com scrypt) e confere a senha digitada no login. |
| `src/lib/dinheiro.ts` | Funções de dinheiro: `formatarCentavos` (1250 → "R$ 12,50"), `lerReais` ("12,50" → 1250) e `calcularSubtotal` (quantidade × preço, arredondado). |

## Telas (`src/app/`)

No App Router, cada pasta dentro de `src/app` vira um endereço do site.
Exemplo: `src/app/clientes/page.tsx` → `/clientes`.

| Arquivo | O que faz |
|---|---|
| `src/app/layout.tsx` | Moldura comum a todas as páginas (`<html>`, fonte, título). |
| `src/app/globals.css` | CSS global; é onde o Tailwind é carregado. Modo escuro desligado até a semana 4. |
| `src/app/login/page.tsx` | Tela de login (`/login`). Quem já está logado é mandado para `/`. |
| `src/app/login/form-login.tsx` | O formulário de login (roda no navegador para mostrar erros e o "Entrando..."). |
| `src/app/login/actions.ts` | Confere email e senha, bloqueia por 15 min após 5 erros seguidos e cria a sessão. |
| `src/app/(app)/` | Grupo das páginas **internas** (exigem login). Os parênteses não aparecem no endereço. |
| `src/app/(app)/layout.tsx` | Moldura das páginas internas: confere o login e mostra o nome da empresa e o botão Sair. |
| `src/app/(app)/actions.ts` | Ação `sair()`: apaga a sessão e volta para o login. |
| `src/app/(app)/page.tsx` | Página inicial (`/`), por enquanto só uma saudação. |
| `src/app/favicon.ico` | Ícone da aba do navegador. |
| `public/` | Imagens e arquivos servidos direto pelo endereço (`/arquivo.svg`). Vazia por enquanto (o `.gitkeep` só existe para o git guardar a pasta). |

## Scripts (`scripts/`)

| Arquivo | O que faz |
|---|---|
| `scripts/criar-empresa.ts` | Cadastra uma empresa e o usuário de login dela. Rode com `npm run criar-empresa`. É o único jeito de criar contas (não existe cadastro público). |
