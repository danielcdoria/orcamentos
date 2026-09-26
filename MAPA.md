# Mapa do projeto

O que cada arquivo e pasta faz. Atualizado a cada parte construída.
Se algo der problema, procure aqui qual arquivo cuida daquilo.

## Publicação

- **Site no ar:** https://orcamentos-psi-lilac.vercel.app (Vercel, plano Hobby, região São Paulo).
- **Como atualizar:** todo `git push` para a branch `main` faz a Vercel publicar a versão nova sozinha (1 a 3 minutos). Antes de montar o site, ela aplica as migrations pendentes no banco de produção (`vercel-build`).
- **Variáveis de ambiente na Vercel:** `DATABASE_URL` e `DIRECT_URL` do banco de **produção** (os mesmos valores do `.env.producao`).
- **Bancos:** a Neon tem dois branches. `production` = dados reais (site publicado). `dev` = testes (o Mac).
- **Plano:** o Hobby da Vercel é só para uso não comercial. Ao entrar o primeiro cliente pagante, mudar para o Pro.

## Configuração do projeto

| Arquivo / pasta | O que faz |
|---|---|
| `package.json` | Lista as bibliotecas usadas e os comandos (`npm run dev`, `npm run build`). Parecido com o `pom.xml` do Maven. O `postinstall` gera o código do Prisma sempre que alguém roda `npm install` (inclusive a Vercel). O `vercel-build` (usado só pela Vercel) aplica as migrations pendentes no banco de produção antes de montar o site. |
| `package-lock.json` | Registra a versão exata de cada biblioteca instalada. Gerado pelo npm, não se edita à mão. |
| `node_modules/` | Onde as bibliotecas ficam instaladas. Não vai para o git; `npm install` recria. |
| `tsconfig.json` | Configuração do TypeScript. |
| `vercel.json` | Configuração da Vercel: roda o site em São Paulo (`gru1`), perto do banco. |
| `next.config.ts` | Configuração do Next.js. Libera o acesso pelo IP da rede de casa em desenvolvimento (`allowedDevOrigins`). Envia os cabeçalhos de proteção (anti-moldura/clickjacking, nosniff, referrer) em todas as páginas. Define a raiz do projeto (`turbopack.root`) porque existe um `package-lock.json` vazio em `~/` que confundia o Next. |
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
| `.env` | **Secreto.** Endereços do banco de **testes** (branch `dev` da Neon), usado pelo Mac. Nunca vai para o git. `DATABASE_URL` (com pooler) é usada pelo site; `DIRECT_URL` (conexão direta) é usada pelas migrations. |
| `.env.producao` | **Secreto.** Endereços do banco **real** (branch `production`), o mesmo que a Vercel usa. Só é lido pelos comandos `*:producao` (ex.: `npm run demo:producao`). Nunca vai para o git. |
| `.env.example` | Modelo do `.env` sem senhas. Mostra quais variáveis o projeto precisa. Vai para o git. |
| `prisma.config.ts` | Diz ao Prisma onde está o schema, onde ficam as migrations e de onde vem o endereço do banco (usa `DIRECT_URL`). |
| `prisma/schema.prisma` | Descreve as tabelas do banco (como as `@Entity` do JPA): Empresa (inclui a mensagem de envio, os prazos e os 4 modelos de cobrança), Cobranca (cada cobrança enviada), EmpresaLogo (a imagem do logo), Usuario (login), Sessao (logins abertos), Cliente, Item (catálogo), Orcamento e OrcamentoItem (linhas do orçamento). |
| `prisma/migrations/` | Histórico das mudanças no banco. Cada pasta é um `.sql` que o Prisma gerou e aplicou. **Não edite à mão.** Se depois de uma migration aparecer `PrismaClientValidationError`, reinicie o `npm run dev` (Ctrl + C e rodar de novo). |
| `src/generated/prisma/` | Código gerado pelo Prisma a partir do schema (`npx prisma generate`). Não vai para o git e não se edita. |
| `src/lib/prisma.ts` | Cria a conexão com o banco que o site inteiro usa. Todo acesso ao banco começa com `import { prisma } from "@/lib/prisma"`. Tem a trava `server-only` (scripts de terminal rodam com `--conditions=react-server` por causa dela). Em desenvolvimento, recria a conexão sozinho quando o Prisma é regenerado. |

## Regras e utilidades (`src/lib/`)

| Arquivo | O que faz |
|---|---|
| `src/lib/auth.ts` | **Porta de entrada.** `exigirSessao()` confere o login e devolve o `empresaId`. Toda página interna e toda ação que grava dados deve chamar essa função e usar o `empresaId` dela nas consultas. |
| `src/lib/sessao.ts` | Cria, lê e apaga a sessão (o cookie `sessao` + a linha na tabela Sessao). Login dura 30 dias. O cookie só exige https quando a conexão é https (Vercel); no Mac, em http, funciona normal. |
| `src/lib/senha.ts` | Embaralha a senha (scrypt com custo recomendado pela OWASP: N=2^17, r=8, p=1) e confere a senha digitada. Aceita o formato antigo e avisa quando ele precisa ser refeito (`precisaRefazer`). |
| `src/lib/cobranca.ts` | **A regra de cobrança.** Conta os dias desde o envio (calendário de Brasília), decide a etapa devida (1ª ou 2ª), escolhe o modelo certo (abriu/não abriu), monta a fila de "Cobrar hoje" (`buscarFila`), conta a fila para o aviso (`contarFila`, mesma decisão) e marca como perdido quem passou do prazo. Não há "relógio": roda sempre que o sistema é aberto. |
| `src/lib/mes.ts` | `mesAtual()`: início e fim do mês atual no horário de Brasília, e o nome ("setembro de 2026"). |
| `src/lib/status.ts` | Nome e cor de cada status, e quais contam como "esperando o cliente" (enviado, aberto). |
| `src/lib/abertura.ts` | Registro de abertura do link público. Decide se a visita conta (ignora robôs como a prévia do WhatsApp, a própria empresa logada e pré-carregamentos) e grava `abertoEm` (1ª vez) e `vezesAberto`. Muda o status para **aberto** (se era rascunho ou enviado); se era rascunho, também marca como enviado agora. Aberturas com menos de 30 min de diferença contam como uma só (`ultimaAberturaEm`). |
| `src/lib/telefone.ts` | `telefoneParaWhatsApp` (limpa o número e põe o 55 do Brasil: "(21) 99999-8888" → "5521999998888") e `formatarTelefone` (mostra como "(21) 99999-8888"). |
| `src/lib/mensagem.ts` | Monta mensagens trocando `{nome}` (primeiro nome), `{cliente}` (nome completo), `{empresa}`, `{valor}`, `{link}`, `{validade}` e `{numero}` pelos dados reais (`{total}` ainda funciona como sinônimo de `{valor}`). |
| `src/lib/formatos.ts` | Datas (`formatarData`, `formatarDataCurta`, `formatarDataHora`, no fuso de Brasília) e `formatarQuantidade`. |
| `src/lib/url.ts` | `urlBase()`: descobre o endereço do site (Vercel em produção) para montar links completos. No `npm run dev`, troca `localhost` pelo IP do Mac na rede, para o link abrir no celular. |
| `src/lib/dinheiro.ts` | Funções de dinheiro: `formatarCentavos` (1250 → "R$ 12,50"), `lerReais` ("12,50" → 1250) e `calcularSubtotal` (quantidade × preço, arredondado) `centavosParaTexto` (1250 → "12,50", para preencher campos), `lerQuantidade` ("2,5" → 2.5) e `quantidadeParaTexto`. |

## Componentes (`src/components/`)

| Arquivo | O que faz |
|---|---|
| `src/components/seletor-status.tsx` | Seletor de status (Rascunho, Enviado, Aberto, Respondido, Fechado, Perdido) usado na lista e na tela do orçamento. Muda na hora, sem abrir o orçamento. |
| `src/components/estilos.ts` | Classes do Tailwind de campos, botões (inclusive o verde do WhatsApp) e mensagens de erro, usadas em todas as telas. Mudar aqui muda o visual do sistema todo. |

## Telas (`src/app/`)

No App Router, cada pasta dentro de `src/app` vira um endereço do site.
Exemplo: `src/app/(app)/clientes/page.tsx` → `/clientes`.
Pastas com colchetes, como `[id]`, são partes variáveis: `/clientes/abc123` abre `clientes/[id]/page.tsx` com `id = "abc123"`.

Padrão de cada tela de cadastro (clientes, catálogo):
- `page.tsx` = a lista · `novo/page.tsx` = criar · `[id]/page.tsx` = editar
- `form-*.tsx` = o formulário (o mesmo para criar e editar)
- `actions.ts` = o que acontece ao salvar/apagar (sempre chama `exigirSessao()` e filtra por `empresaId`)

| Arquivo | O que faz |
|---|---|
| `src/app/layout.tsx` | Moldura comum a todas as páginas (`<html>`, fonte, título). Desliga a transformação automática de telefones em links do Safari (evita o erro "Hydration failed"). |
| `src/app/globals.css` | CSS global; é onde o Tailwind é carregado. Modo escuro desligado até a semana 4. Tem as regras de impressão/PDF (folha A4, margens, imprimir cores de fundo). As classes `print:` nas páginas também só valem na impressão. |
| `src/app/login/page.tsx` | Tela de login (`/login`). Quem já está logado é mandado para `/`. |
| `src/app/login/form-login.tsx` | O formulário de login (roda no navegador para mostrar erros e o "Entrando..."). |
| `src/app/login/actions.ts` | Confere email e senha, bloqueia por 15 min após 5 erros seguidos (contagem atômica: tentativas simultâneas não furam o limite), refaz senhas no formato antigo e cria a sessão. |
| `src/app/(app)/` | Grupo das páginas **internas** (exigem login). Os parênteses não aparecem no endereço. |
| `src/app/(app)/layout.tsx` | Moldura das páginas internas: confere o login e mostra o nome da empresa, o link Configurações e o botão Sair. |
| `src/app/(app)/actions.ts` | Ação `sair()`: apaga a sessão e volta para o login. |
| `src/app/(app)/page.tsx` | Página inicial (`/`). Só redireciona para `/painel`. |
| `src/app/(app)/painel/page.tsx` | **Painel** (`/painel`): valor parado esperando resposta (em destaque), e enviados, fechados e taxa de fechamento do mês. |
| `src/app/(app)/menu.tsx` | Menu principal (Painel, Cobrar, Orçamentos, Clientes, Catálogo): abas no topo no computador, barra fixa no rodapé no celular. |
| `src/app/(app)/cobrar/page.tsx` | **Cobrar hoje** (`/cobrar`), a tela principal do produto: lista quem precisa ser cobrado hoje (regra em `src/lib/cobranca.ts`). |
| `src/app/(app)/cobrar/cartao-cobranca.tsx` | Um cartão por cliente: valor, há quantos dias foi enviado, se abriu, qual cobrança, mensagem editável e os botões "Enviar no WhatsApp" e "Já respondeu". |
| `src/app/(app)/cobrar/actions.ts` | `registrarCobranca` (grava a cobrança enviada, com o texto final, e tira da fila) e `marcarRespondido`. O sistema nunca envia nada sozinho. |
| `src/app/(app)/orcamentos/page.tsx` | Lista de orçamentos: mais recentes primeiro, com cliente, número, data, status e total (mostra os 100 últimos). Tocar abre o orçamento. Selo **Visto** / **Não visto** mostra se o cliente abriu o link. Cada linha tem o seletor de status. No topo, o aviso amarelo "N orçamentos esperando cobrança hoje" leva para `/cobrar`. |
| `src/app/(app)/orcamentos/[id]/page.tsx` | Tela interna de um orçamento: quando foi enviado, cobranças já feitas, se/quando o cliente abriu, resumo, itens, botões de envio e o link da página pública. Monta a mensagem e o link `wa.me`. |
| `src/app/(app)/orcamentos/[id]/botoes-envio.tsx` | Botões "Enviar no WhatsApp" (abre o WhatsApp e marca como enviado) e "Copiar link". |
| `src/app/(app)/orcamentos/novo/page.tsx` | Tela de novo orçamento. Busca clientes e o catálogo inteiro e entrega ao formulário. |
| `src/app/(app)/orcamentos/novo/form-orcamento.tsx` | Montagem do orçamento: escolher cliente, buscar e adicionar itens, editar quantidade e preço, total ao vivo, observação. |
| `src/app/(app)/orcamentos/actions.ts` | `salvarOrcamento`: valida tudo, **recalcula** subtotais e total no servidor, gera o número sequencial da empresa e a validade (hoje + `diasValidade`), e abre o orçamento criado. `marcarEnviado`: guarda `enviadoEm` do PRIMEIRO envio e muda rascunho → enviado. `alterarStatus`: troca manual de status. |
| `src/app/(app)/clientes/page.tsx` | Lista de clientes (ordem alfabética). |
| `src/app/(app)/clientes/novo/page.tsx` | Tela de novo cliente. |
| `src/app/(app)/clientes/[id]/page.tsx` | Tela de editar cliente. |
| `src/app/(app)/clientes/form-cliente.tsx` | Formulário de cliente (nome, telefone, observação). |
| `src/app/(app)/clientes/actions.ts` | `salvarCliente`: valida e cria/edita. |
| `src/app/(app)/catalogo/page.tsx` | Lista do catálogo com busca (`/catalogo?busca=lona`). |
| `src/app/(app)/catalogo/novo/page.tsx` | Tela de novo item. |
| `src/app/(app)/catalogo/[id]/page.tsx` | Tela de editar item (com botão Apagar). |
| `src/app/(app)/catalogo/form-item.tsx` | Formulário de item (descrição, preço, unidade). |
| `src/app/(app)/catalogo/actions.ts` | `salvarItem` e `apagarItem`. |
| `src/app/(app)/configuracoes/page.tsx` | Tela de configurações da empresa (`/configuracoes`). |
| `src/app/(app)/configuracoes/form-empresa.tsx` | Formulário: nome, telefone, condição de pagamento, dias de validade e mensagem de envio (com prévia ao vivo). |
| `src/app/(app)/configuracoes/form-cobranca.tsx` | Seção Cobrança: prazos (1ª, 2ª, perdido) e os 4 modelos de mensagem (1ª/2ª × abriu/não abriu). |
| `src/app/(app)/configuracoes/logo.tsx` | Escolher/trocar/remover logo. Reduz a imagem no navegador (máx. 512 px) antes de enviar. |
| `src/app/(app)/configuracoes/actions.ts` | `salvarEmpresa`, `salvarCobranca` (prazos em ordem, mensagens não vazias), `salvarLogo` (confere se o arquivo é mesmo PNG/JPG/WebP) e `removerLogo`. |
| `src/app/logo/[empresaId]/route.ts` | Entrega a imagem do logo guardada no banco (endereço `/logo/<empresaId>`). Público, porque aparece na página do cliente. |
| `src/app/orcamento/[token]/page.tsx` | **Página pública** do orçamento (sem login), a que o cliente abre. O `token` é um código de 64 caracteres sorteado pelo banco. O telefone da empresa é um link de ligação. Também define o título/descrição da prévia no WhatsApp, pede ao Google para não indexar e registra a abertura (ver `src/lib/abertura.ts`). |
| `src/app/orcamento/[token]/botao-pdf.tsx` | Botão "Baixar PDF": abre a impressão do navegador (Salvar como PDF). Some na impressão. |
| `src/app/orcamento/[token]/not-found.tsx` | Mensagem para o **cliente** quando o link do orçamento está errado (sem link para o login). |
| `src/app/not-found.tsx` | Página "não encontrada" (endereço inexistente ou de outra empresa). |
| `src/app/favicon.ico` | Ícone da aba do navegador. |
| `public/` | Imagens e arquivos servidos direto pelo endereço (`/arquivo.svg`). Vazia por enquanto (o `.gitkeep` só existe para o git guardar a pasta). |

## Scripts (`scripts/`)

| Arquivo | O que faz |
|---|---|
| `scripts/demo-oficina.ts` | Dados de demonstração: recria a "Oficina Silva" (12 clientes, 25 itens de oficina, 18 orçamentos com datas a partir de hoje, 3 deles em "Cobrar hoje"). `npm run demo` (banco de testes) ou `npm run demo:producao` (site publicado). Apaga só a Oficina Silva anterior. |
| `scripts/demo/logo-oficina-silva.png` | Logo da Oficina Silva usado pelo script de demonstração. |
| `scripts/criar-empresa.ts` | Cadastra uma empresa e o usuário de login dela. `npm run criar-empresa` (testes) ou **`npm run criar-empresa:producao`** (clientes reais, no site publicado). É o único jeito de criar contas (não existe cadastro público). |
