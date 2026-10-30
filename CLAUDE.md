@AGENTS.md

# Como trabalhar neste projeto

- **Gaste poucos tokens.** O limite de uso é apertado: vá direto ao ponto, leia só os arquivos que a tarefa precisa (de preferência só o trecho), não releia o que já leu na sessão e não explore o projeto "para entender" sem necessidade.
- **Documentação do Next (aviso do `AGENTS.md`):** antes de abrir `node_modules/next/dist/docs/`, procure no próprio projeto (`src/app/`) um exemplo do mesmo padrão e siga ele. Abra a documentação só para uma API do Next que o projeto ainda não usa, e leia só o guia dessa API.
- **O `MAPA.md` tem ~43 KB: nunca leia inteiro.** Para achar onde mexer, leia a seção 6 ("Onde mexer para...") ou procure o título da seção com grep. Sempre que criar, renomear, mover ou apagar um arquivo, atualize no `MAPA.md` só a parte que mudou, no mesmo commit.
- Node 24 via nvm: no Bash, rode `. ~/.nvm/nvm.sh` antes de `npm`/`npx`.

# O que é

Sistema de orçamentos para pequenas empresas (oficinas, gráficas, marcenarias). Várias empresas usam o mesmo banco, separadas pelo `empresaId`. Next.js 16 (App Router) + TypeScript, Tailwind 4, Prisma 7 + adapter-pg, Postgres na Neon, Vercel. Stack fixa: não sugira trocar.

# Regras que não podem ser quebradas (detalhes na seção 2 do `MAPA.md`)

1. O `empresaId` vem sempre do login: toda página e ação começa com `const { empresaId } = await exigirSessao()` (`src/lib/auth.ts`) e toda consulta filtra por ele (`findFirst({ where: { id, empresaId } })`, `updateMany`/`deleteMany` com `empresaId`).
2. Toda ação em `actions.ts` chama `exigirSessao()` por conta própria.
3. Dinheiro sempre em centavos (inteiro). Nunca `Decimal`/`float`. Máximo: `VALOR_MAXIMO` (R$ 20 milhões).
4. O servidor recalcula subtotais e total; nunca confie em valores do navegador.
5. O sistema nunca envia WhatsApp sozinho nem usa biblioteca não oficial; só links `wa.me`.
6. O banco só muda pelo Prisma: `prisma/schema.prisma` + `npx prisma migrate dev --name ...`.
7. Custo, lucro e margem são internos: a página pública e o PDF só leem os campos de `src/lib/publico.ts` (`select`, nunca `include`).
8. Mexeu em tela ou ação: rode `npm run teste:isolamento` (com o `npm run dev` ligado).
9. Senha só como hash (`src/lib/senha.ts`). `.env` e `.env.producao` nunca vão para o git nem para a conversa.

# Comandos

- `npm run dev` (http://localhost:3000), `npm run lint`, `npm run build`, `npm run teste:isolamento`.
- Scripts que terminam em `:producao` mexem nos dados reais: só rode com o OK do Daniel.
- Todo `git push` na `main` publica na Vercel e aplica as migrations no banco real.
