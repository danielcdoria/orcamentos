# Mapa do projeto

Guia para quem volta a este código depois de um tempo (inclusive você mesmo, daqui a três meses).
Leia na ordem: primeiro como rodar, depois as regras, depois como os dados andam. A lista de
arquivos (seção 5) é para consulta.

**O que é:** um sistema de orçamentos para pequenas empresas (oficinas, gráficas, marcenarias).
A empresa monta o orçamento, manda o link pelo WhatsApp, vê se o cliente abriu, e o sistema
diz quem cobrar em cada dia, com a mensagem pronta. **Várias empresas usam o mesmo sistema**,
cada uma com o seu login, e uma nunca vê os dados da outra.

**No ar:** https://orcamentos-psi-lilac.vercel.app

---

## 1. Como rodar e publicar

### Comandos do dia a dia (na pasta do projeto)

| Comando | Para que serve |
|---|---|
| `npm run dev` | Liga o sistema no Mac em http://localhost:3000. **É o comando do dia a dia.** Se atualiza sozinho a cada mudança no código. |
| `npm run lint` | Procura erros e más práticas no código. |
| `npm run build` | Monta a versão de produção (o mesmo que a Vercel faz). Bom para conferir antes de publicar. |
| `npx prisma migrate dev --name o-que-mudou` | Depois de mudar `prisma/schema.prisma`: cria e aplica a mudança no banco de **testes**. |
| `npx prisma studio` | Abre no navegador uma "planilha" do banco de testes, para olhar e mexer nos dados. |
| `npm run criar-empresa:producao` | **Cadastra um cliente pagante** (empresa + login) no banco real. É o único jeito de criar contas. |
| `npm run criar-empresa` | O mesmo, no banco de testes. |
| `npm run demo:producao` / `npm run demo` | Recria a "Oficina Silva" de demonstração (banco real / de testes). Só apaga a Oficina Silva. |
| `npm run demo:marcenaria:producao` / `npm run demo:marcenaria` | Recria a "Madeira Nobre" (marcenaria de móveis sob medida e montagem) de demonstração. Só apaga a Madeira Nobre. |
| `npm run teste:isolamento` | **Teste de vazamento entre empresas** (com o `npm run dev` ligado). Rode sempre que mexer em telas ou ações. Tem que terminar com "Nenhum vazamento encontrado". |

> ⚠️ `npm start` **não** é para o dia a dia: ele roda a última versão empacotada (antiga) e,
> no Mac, o login não funciona com ele. Use `npm run dev`.

Pré-requisito: Node 24 (instalado via `nvm`) e o arquivo `.env` preenchido (veja `.env.example`).

### Publicar

Todo `git push` para a branch `main` faz a **Vercel** publicar a versão nova sozinha, em cerca
de 1 minuto. Antes de montar o site, ela aplica no banco real as mudanças de estrutura
pendentes (script `vercel-build`). Não há nada para fazer à mão.

- Plano da Vercel: **Hobby (grátis), que só permite uso não comercial.** Ao entrar o primeiro
  cliente pagante, mudar para o **Pro** (US$ 20/mês).
- Região: São Paulo (`gru1`, em `vercel.json`), perto do banco.

### Backup (automático)

Todo dia às 03:00 de Brasília, o GitHub copia o banco **de produção** inteiro, confere a cópia,
**tranca com a senha de backup** e guarda por **30 dias** (aba *Actions* do repositório >
"Backup do banco" > uma execução > *Artifacts*). Arquivos: `.github/workflows/backup.yml`.

- **Secrets no GitHub** (Settings > Secrets and variables > Actions): `BACKUP_DATABASE_URL` (o
  `DIRECT_URL` da produção), `BACKUP_SENHA` (a senha que tranca; **sem ela o backup não abre**,
  guarde num gerenciador de senhas) e `RESTORE_DATABASE_URL` (destino de uma restauração).
- **Rodar um backup na hora:** `gh workflow run backup.yml`
- **Restaurar:** 1) na Neon, crie um branch novo e ponha o endereço direto dele em
  `RESTORE_DATABASE_URL`; 2) `gh workflow run restaurar.yml -f backup=backup-AAAA-MM-DD`;
  3) confira os dados nesse branch; 4) se estiver certo, troque as variáveis da Vercel para ele
  (ou peça ajuda). A tarefa **se recusa a escrever por cima da produção** sem a confirmação
  `SUBSTITUIR PRODUCAO`.
- **Abrir um backup no Mac** (depois de baixar o `.dump.enc`):
  `openssl enc -d -aes-256-cbc -pbkdf2 -iter 200000 -md sha256 -in backup-AAAA-MM-DD.dump.enc -out backup.dump`

### Os dois bancos (Neon)

| Branch na Neon | Quem usa | Arquivo com o endereço |
|---|---|---|
| `production` | **Dados reais.** O site publicado. | Variáveis de ambiente da Vercel e `.env.producao` |
| `dev` | Testes. O `npm run dev` no Mac. Pode mexer à vontade. | `.env` |

### Variáveis de ambiente (as únicas do projeto)

| Nome | O que é |
|---|---|
| `DATABASE_URL` | Endereço do banco **com pooler** (`-pooler` no endereço). O site lê e grava por ele. |
| `DIRECT_URL` | Endereço **direto** do mesmo banco. Só para aplicar mudanças de estrutura (migrations). |

Os dois contêm a senha do banco: **nunca vão para o git nem para conversas.**

---

## 2. Regras que não podem ser quebradas

Todas as empresas ficam **no mesmo banco**; a separação entre elas é feita pelo `empresaId` em
cada registro. Por isso estas regras são tão importantes.

1. **O `empresaId` vem sempre do login, nunca do formulário ou do endereço.** Toda página e
   toda ação começa com `const { empresaId } = await exigirSessao()` (`src/lib/auth.ts`) e toda
   consulta ao banco filtra por esse `empresaId`. É isso que impede uma empresa de ver os dados
   de outra. Para buscar um registro por id, use `findFirst({ where: { id, empresaId } })` e
   `updateMany/deleteMany` com `empresaId` no filtro.
2. **Toda ação que grava dados (`actions.ts`) chama `exigirSessao()` por conta própria.** O
   layout protege as páginas, mas uma ação pode ser chamada diretamente, sem passar pela página.
3. **Dinheiro sempre em centavos, número inteiro.** R$ 12,50 = `1250`. Nunca `Decimal`/`float`
   para dinheiro. Máximo aceito: R$ 20.000.000,00 (`VALOR_MAXIMO`), porque o banco guarda até
   ~R$ 21,4 milhões nesse tipo de campo.
4. **O servidor recalcula tudo.** Subtotais e total de um orçamento são calculados de novo no
   servidor; nunca confie em valores que vêm do navegador.
5. **O sistema NUNCA envia mensagem de WhatsApp sozinho**, e não se usa biblioteca não oficial
   de WhatsApp (elas fazem o número da empresa ser banido). O sistema decide quem cobrar e
   escreve o texto; quem toca em "Enviar" é a pessoa, pelo link `wa.me`.
6. **Mudança no banco é sempre pelo Prisma:** edite `prisma/schema.prisma` e rode
   `npx prisma migrate dev --name ...`. Nunca altere tabelas pelo painel da Neon.
7. **Custo, lucro e margem são internos.** A página pública e o PDF só leem os campos de
   `src/lib/publico.ts`. Nunca troque aquele `select` por `include`, e nunca coloque custo lá.
   O `npm run teste:isolamento` confere isso (procura o custo no HTML e dentro do PDF).
   Os itens que vão para os componentes do navegador na página pública (`ItemEscolha`, em
   `escolha.tsx`) são montados campo por campo, também sem custo.
8. **Mexeu em tela ou ação? Rode `npm run teste:isolamento`.** Ele confere que nenhuma empresa
   consegue ver ou alterar dados de outra.
9. **Senhas nunca são guardadas**, só o hash (`src/lib/senha.ts`). E o `.env`/`.env.producao`
   nunca são compartilhados.

---

## 3. Como os dados andam: do orçamento criado até a cobrança

```
 Empresa (logada)                         Cliente final (sem login)
 ─────────────────                        ─────────────────────────
 1. Novo orçamento ──► salvarOrcamento
                        (grava Orcamento + itens, sorteia o token)
 2. Enviar no WhatsApp ─► marcarEnviado ──► link wa.me com /orcamento/<token>
                        (status "enviado", enviadoEm)          │
                                                               ▼
                                          3. Abre /orcamento/<token>
                                             registrarAbertura (status "aberto")
                                             escolhe opções ─► salvarEscolha (total muda)
                                             pode baixar o PDF (/orcamento/<token>/pdf)
 4. Cobrar hoje ◄── buscarFila (dias desde o envio, abriu ou não)
    Enviar cobrança ─► registrarCobranca  |  Já respondeu ─► status "respondido"
 5. Painel: valor parado, enviados, fechados, taxa
```

### Passo 1: criar o orçamento
1. `/orcamentos/novo` (`src/app/(app)/orcamentos/novo/page.tsx`) busca os clientes e o catálogo
   **da empresa logada** e entrega ao formulário.
2. O formulário (`form-orcamento.tsx`) roda no navegador: a pessoa escolhe o cliente, busca
   itens do catálogo, ajusta quantidade e preço, e vê o total mudar na hora
   (`calcularSubtotal` em `src/lib/dinheiro.ts`). Cliente novo? O link "Cliente novo? Cadastrar"
   vai para `/clientes/novo?voltar=orcamento` e volta com o cliente já escolhido.
   Cada item tem um **tipo**: Fixo (sempre entra), Opção (de um grupo, ex.: "Material"; o
   cliente escolhe 1, e uma delas é a "padrão") ou Adicional (o cliente marca se quiser). As
   regras de grupo, padrão e total ficam em `src/lib/opcoes.ts`.
3. Ao salvar, chama `salvarOrcamento` (`src/app/(app)/orcamentos/actions.ts`), que:
   - confere o login e que o cliente é **desta** empresa;
   - valida e **recalcula** cada subtotal e o total, em centavos;
   - com opções: cada grupo precisa de 2+ opções e fica com 1 padrão; o total começa com os
     fixos + a padrão de cada grupo (adicionais desmarcados). O limite de valor vale para o
     total mais caro que o cliente conseguir montar;
   - numa transação, pega o maior número da empresa e soma 1 (nº 1, 2, 3...);
   - define a validade (hoje + `diasValidade` da empresa);
   - grava o `Orcamento` e os `OrcamentoItem`. Os itens guardam uma **cópia** da descrição e
     do preço: mudar o catálogo depois não altera orçamentos antigos;
   - o próprio banco sorteia o `token` (64 caracteres aleatórios) do link público;
   - abre a tela do orçamento com o aviso "Orçamento criado".

### Passo 2: enviar
1. `/orcamentos/[id]` (`src/app/(app)/orcamentos/[id]/page.tsx`) monta:
   - o link público: `urlBase()` (`src/lib/url.ts`) + `/orcamento/<token>`;
   - a mensagem, a partir do modelo "mensagem de envio" dos Ajustes (`montarMensagem` em
     `src/lib/mensagem.ts`, que troca `{nome}`, `{valor}`, `{link}` etc.);
   - o número do cliente no formato do WhatsApp (`telefoneParaWhatsApp` em `src/lib/telefone.ts`).
2. O botão "Enviar no WhatsApp" (`botoes-envio.tsx`) é um link `https://wa.me/<número>?text=...`
   que abre o WhatsApp. Ao tocar, chama `marcarEnviado`: grava `enviadoEm` (só o **primeiro**
   envio, porque é dele que a cobrança conta os dias) e muda o status de rascunho para enviado.

### Passo 3: o cliente abre o link
1. `/orcamento/[token]` (`src/app/orcamento/[token]/page.tsx`) é **pública**: busca o orçamento
   pelo token (quem tem o link, vê).
2. `visitaContaComoAbertura` (`src/lib/abertura.ts`) decide se a visita conta: **não** contam
   robôs (a prévia do WhatsApp), a própria empresa logada nem pré-carregamentos do navegador.
3. Se conta, `registrarAbertura` roda depois de a página ser enviada (`after`): grava `abertoEm`
   (1ª vez), soma `vezesAberto` (no máximo uma vez a cada 30 min) e muda o status para
   **aberto**. Se o orçamento ainda era rascunho (link mandado por "Copiar link"), também marca
   como enviado agora.
4. O `generateMetadata` da mesma página define o cartão da prévia no WhatsApp (título, valor,
   logo ou imagem neutra) e pede ao Google para não indexar.
5. "Baixar PDF" chama `/orcamento/[token]/pdf` (`pdf/route.ts`), que monta o PDF no servidor
   (`pdf/documento-pdf.tsx`) e devolve o arquivo para download.
6. **Orçamento com opções:** a página mostra os fixos, depois os grupos (botões de escolha
   única) e os adicionais (caixas de marcar); o total muda na hora (`escolha.tsx`, no
   navegador). Um segundo depois da última mudança, `salvarEscolha`
   (`src/app/orcamento/[token]/actions.ts`, **pública, sem login**) grava: marca os itens
   escolhidos (`incluido`), atualiza o `total` do orçamento e registra uma `EscolhaCliente`
   (o que ficou escolhido e quando). A ação só confia no token, só mexe em itens daquele
   orçamento, exige 1 opção por grupo, **não salva** quando é a própria empresa logada
   conferindo ("Ver como o cliente vê") e não aceita troca em orçamento **fechado**.
   O "Responder no WhatsApp" já leva a escolha no texto, e o PDF sai com a escolha atual
   (e lista as outras opções embaixo).

### Passo 4: a cobrança
1. Toda tela interna (`src/app/(app)/layout.tsx`) chama `contarFila` para mostrar a bolinha
   vermelha em "Cobrar hoje". A contagem também aplica `marcarPerdidosVencidos`: quem passou do
   prazo de "desistir" vira **perdido**. Não existe um "relógio": a regra roda sempre que o
   sistema é aberto.
2. `/cobrar` chama `buscarFila` (`src/lib/cobranca.ts`), que para cada orçamento **enviado ou
   aberto**: conta os dias de calendário (Brasília) desde `enviadoEm`, decide a etapa devida (1ª
   ou 2ª, conforme os prazos dos Ajustes e as cobranças já feitas), escolhe o modelo de texto
   (viu / não viu) e monta a mensagem. Se o cliente **mexeu nas opções** (tem `EscolhaCliente`),
   o cartão mostra "Mexeu nas opções": sinal de dúvida de preço. A tela do orçamento mostra o
   mesmo sinal, a escolha atual, o total que você propôs e cada troca no histórico.
3. Cada cartão (`cartao-cobranca.tsx`) tem a mensagem editável e dois botões:
   - "Enviar no WhatsApp" abre o `wa.me` e chama `registrarCobranca`, que grava uma `Cobranca`
     (a etapa e o texto final). Assim aquela etapa não aparece de novo;
   - "O cliente já respondeu" chama `marcarRespondido`, que tira o orçamento da fila.
4. Trocar o status para respondido, fechado ou perdido (pílula de status na lista ou no
   orçamento) também tira da fila.

### Passo 5: o painel
`/painel` mostra o **valor parado** (soma dos orçamentos enviados ou abertos, de qualquer mês),
e os enviados, fechados e a taxa de fechamento **entre os enviados no mês atual**.

---

## 4. As tabelas (`prisma/schema.prisma`)

| Tabela | O que guarda |
|---|---|
| `Empresa` | Cada empresa cliente: nome, telefone, condição de pagamento, dias de validade, mensagem de envio, prazos de cobrança (1ª, 2ª, desistir) e os 4 modelos de mensagem de cobrança. |
| `EmpresaLogo` | A imagem do logo (PNG/JPG), separada para não pesar nas outras consultas. |
| `Usuario` | O login da empresa (um por empresa): email, hash da senha, contador de tentativas erradas e bloqueio. |
| `Sessao` | Cada login aberto (um celular, um computador). Guarda o hash do código do cookie. Dura 30 dias. |
| `Cliente` | Os clientes da empresa: nome, telefone, observação. |
| `Item` | O catálogo: descrição, preço (centavos), unidade e **custo padrão** (opcional, interno). |
| `Orcamento` | Número, cliente, total (centavos; soma dos itens **incluídos**, muda quando o cliente troca uma opção), observação, validade, status, token do link, datas de envio/abertura, vezes aberto. |
| `OrcamentoItem` | As linhas do orçamento: cópia da descrição e do preço, quantidade (aceita 2,5), subtotal, **custo por unidade** (opcional, interno: nunca vai para o cliente) e as opções: `tipo` (fixo, opcao, adicional), `grupo`, `padrao` e `incluido` (está no total agora). Orçamentos antigos: tudo fixo e incluído. |
| `EscolhaCliente` | Cada vez que o cliente mudou as opções na página: resumo da escolha, total e quando. Máximo de 100 por orçamento. |
| `Cobranca` | Cada cobrança enviada: etapa (1 ou 2) e o texto. Uma por etapa por orçamento. |

**Status do orçamento:** `rascunho` → `enviado` (tocou em Enviar) → `aberto` (cliente viu,
automático) → `respondido` / `fechado` / `perdido` (à mão; perdido também é automático após o
prazo de desistir). Enquanto está **enviado ou aberto**, o orçamento está "esperando o cliente"
e entra na cobrança e no valor parado.

---

## 5. Arquivo por arquivo

### Raiz do projeto
| Arquivo | O que faz |
|---|---|
| `package.json` | Bibliotecas usadas e comandos (seção 1). `postinstall` gera o código do Prisma; `vercel-build` aplica migrations antes de montar o site na Vercel. |
| `package-lock.json` | Versões exatas das bibliotecas. Gerado pelo npm; não se edita. |
| `.env` | **Secreto.** Endereços do banco de testes (`dev`). Fora do git. |
| `.env.producao` | **Secreto.** Endereços do banco real (`production`). Só usado pelos comandos `*:producao`. Fora do git. |
| `.env.example` | Modelo do `.env` sem senhas: mostra quais variáveis existem. |
| `.gitignore` | O que o git ignora (`node_modules`, `.env*` exceto o exemplo, código gerado do Prisma). |
| `prisma.config.ts` | Diz ao Prisma onde estão o schema e as migrations, e que ele usa `DIRECT_URL`. |
| `next.config.ts` | Cabeçalhos de proteção em todas as páginas (anti-moldura, nosniff, referrer), acesso pela rede de casa no `npm run dev` e raiz do projeto. |
| `vercel.json` | Roda o site em São Paulo (`gru1`). |
| `.github/workflows/backup.yml` | Tarefa do GitHub que faz o backup diário trancado do banco de produção (seção 1). |
| `.github/workflows/restaurar.yml` | Tarefa do GitHub para restaurar um backup num banco (com trava contra escrever por cima da produção). |
| `tsconfig.json` | Configuração do TypeScript (o atalho `@/` aponta para `src/`). |
| `eslint.config.mjs` | Regras do `npm run lint`. |
| `postcss.config.mjs` | Liga o Tailwind ao CSS. |
| `README.md` | Apresentação curta do projeto (primeira coisa que aparece no GitHub). |
| `MAPA.md` | Este arquivo. |
| `CLAUDE.md` / `AGENTS.md` | Instruções para assistentes de IA (inclui: manter este mapa atualizado). |

Pastas geradas (fora do git, não se edita): `node_modules/` (bibliotecas, recriada por
`npm install`), `.next/` (arquivos temporários do Next; pode apagar se algo ficar estranho),
`src/generated/prisma/` (código gerado pelo Prisma a partir do schema).

### Banco de dados (`prisma/`)
| Arquivo | O que faz |
|---|---|
| `prisma/schema.prisma` | As tabelas (seção 4), com comentários. Os textos padrão das mensagens para empresas **novas** estão aqui. |
| `prisma/migrations/` | Histórico de cada mudança no banco, em SQL, na ordem em que foi feita. **Não edite à mão.** |

### Regras e utilidades (`src/lib/`)
| Arquivo | O que faz |
|---|---|
| `auth.ts` | `exigirSessao()`: confere o login e devolve `empresaId` e nome da empresa. **A porta de entrada de tudo.** |
| `sessao.ts` | Cria, lê e apaga a sessão (cookie `sessao` + tabela `Sessao`). Cookie invisível ao JavaScript; exige https quando a conexão é https (Vercel). |
| `senha.ts` | Hash da senha com scrypt (custo recomendado pela OWASP) e conferência no login. Aceita e manda refazer hashes antigos. |
| `prisma.ts` | A conexão com o banco usada por tudo (`import { prisma } from "@/lib/prisma"`). Tem a trava `server-only` e se recria sozinha quando o Prisma é regenerado. |
| `dinheiro.ts` | `formatarCentavos` (1250 → "R$ 12,50"), `lerReais` ("12,50" → 1250), `calcularSubtotal`, `centavosParaTexto`, `lerQuantidade` ("2,5" → 2.5) e `VALOR_MAXIMO`. |
| `formatos.ts` | Datas no fuso de Brasília (`formatarData`, `formatarDataHora`) e `formatarQuantidade`. |
| `telefone.ts` | `telefoneParaWhatsApp` ("(21) 99999-8888" → "5521999998888") e `formatarTelefone`. |
| `mensagem.ts` | `montarMensagem`: troca `{nome}`, `{cliente}`, `{empresa}`, `{valor}`, `{link}`, `{validade}`, `{numero}` pelos dados reais. |
| `status.ts` | Nome e cor de cada status, e quais contam como "esperando o cliente". |
| `cobranca.ts` | **A regra de cobrança** (passo 4): dias desde o envio, etapa devida, fila do dia, contagem para a bolinha, perdidos automáticos. |
| `abertura.ts` | Decide se uma visita ao link conta como abertura e grava a abertura (passo 3). |
| `margem.ts` | Custo total, lucro e margem de um orçamento (margem = lucro ÷ venda) e a faixa de cor (verde > 30%, amarelo 15–30%, vermelho < 15%). Interno. |
| `opcoes.ts` | **Opções que o cliente escolhe**: separa fixos, grupos e adicionais, define a padrão de cada grupo, soma o total e escreve o resumo ("Material: MDF comum · + LED"). Roda no servidor e no navegador. |
| `publico.ts` | **O que pode ir para o cliente final**: os únicos campos que a página pública e o PDF pedem ao banco. O custo não está aqui, por isso nem sai do banco nesses caminhos. |
| `mes.ts` | Início, fim e nome do mês atual em Brasília (para o painel). |
| `url.ts` | `urlBase()`: endereço do site para montar links. No `npm run dev`, troca `localhost` pelo IP do Mac na rede. |

### Componentes compartilhados (`src/components/`)
| Arquivo | O que faz |
|---|---|
| `estilos.ts` | Classes de campos (48px), botões (principal azul, secundário, perigo), cartões, títulos e mensagens. **Mudar aqui muda o visual do sistema todo.** |
| `seletor-status.tsx` | A pílula de status que troca na hora e mostra "Salvo ✓". |
| `aviso.tsx` | Aviso verde de "deu certo" quando a tela recebe `?ok=<código>`. Os códigos e textos ficam aqui. |
| `bloco-margem.tsx` | Bloco "Só você vê": custo, lucro e margem colorida. Usado no novo orçamento e na tela do orçamento; nunca na página pública. |
| `estado-vazio.tsx` | Tela vazia padrão: ícone, título, explicação e botão. |

### Páginas e ações (`src/app/`)
No App Router, cada pasta vira um endereço: `src/app/(app)/clientes/page.tsx` → `/clientes`.
Pastas entre parênteses, como `(app)`, **não** aparecem no endereço; entre colchetes, como
`[id]`, são partes variáveis (`/clientes/abc123` → `id = "abc123"`). `page.tsx` é a tela,
`actions.ts` é o que roda no servidor ao salvar, `form-*.tsx` é o formulário (roda no navegador).

**Geral**
| Arquivo | O que faz |
|---|---|
| `src/app/layout.tsx` | Moldura de todas as páginas: idioma, título, ícone e imagem de prévia neutros, e desliga a transformação automática de telefones em link do Safari. |
| `src/app/globals.css` | **Identidade visual:** cor de destaque `marca` (azul escuro, só em botão principal e valores totais), fonte do sistema, fundo cinza claro. |
| `src/app/not-found.tsx` | "Página não encontrada" (endereço inexistente ou de outra empresa). |

**Login (`src/app/login/`)**
| Arquivo | O que faz |
|---|---|
| `page.tsx` | Tela de entrada. Quem já está logado vai direto para o sistema. |
| `form-login.tsx` | O formulário de email e senha. |
| `actions.ts` | `entrar`: confere a senha, bloqueia por 15 min após 5 erros (contagem à prova de tentativas simultâneas) e cria a sessão. |

**Sistema interno, com login (`src/app/(app)/`)**
| Arquivo | O que faz |
|---|---|
| `layout.tsx` | Exige login em todas as telas internas; topo com nome da empresa, Clientes e Ajustes; conta a fila de cobrança; troca o ícone da aba pelo logo da empresa. |
| `menu.tsx` | Menu de 4 ícones (Orçamentos, Cobrar hoje, Catálogo, Painel): embaixo no celular, no topo no computador. Bolinha vermelha em Cobrar hoje. |
| `page.tsx` | `/` só redireciona para `/orcamentos`. |
| `actions.ts` | `sair`: apaga a sessão. |
| `orcamentos/page.tsx` | Lista de orçamentos (mais recentes primeiro), faixa de cobrança pendente, pílula de status e "Viu / Não viu". |
| `orcamentos/novo/page.tsx` | Tela de novo orçamento (explica o que falta se não houver cliente ou catálogo). |
| `orcamentos/novo/form-orcamento.tsx` | Montagem do orçamento com total ao vivo (passo 1): custo, tipo do item (Fixo / Opção / Adicional), grupo e padrão. |
| `orcamentos/[id]/page.tsx` | Um orçamento: total, escolha do cliente (e o sinal "mexeu nas opções"), margem, envio, "Ver como o cliente vê", PDF, itens (por grupo), observação e histórico. |
| `orcamentos/[id]/botoes-envio.tsx` | "Enviar no WhatsApp" e "Copiar link do orçamento". |
| `orcamentos/actions.ts` | `salvarOrcamento`, `marcarEnviado`, `alterarStatus`. |
| `cobrar/page.tsx` | **Cobrar hoje**, a tela principal do produto (passo 4). |
| `cobrar/cartao-cobranca.tsx` | Um cartão por cliente com a mensagem pronta e os dois botões. |
| `cobrar/actions.ts` | `registrarCobranca` e `marcarRespondido`. |
| `painel/page.tsx` | Os quatro números (passo 5). |
| `clientes/page.tsx` | Lista de clientes. |
| `clientes/novo/page.tsx` | Novo cliente (com `?voltar=orcamento`, volta ao orçamento com o cliente escolhido). |
| `clientes/[id]/page.tsx` | Editar cliente. |
| `clientes/form-cliente.tsx` | Formulário de cliente (nome, WhatsApp, observação). |
| `clientes/actions.ts` | `salvarCliente`. |
| `catalogo/page.tsx` | Catálogo com busca (`/catalogo?busca=oleo`). |
| `catalogo/novo/page.tsx` | Novo item. |
| `catalogo/[id]/page.tsx` | Editar item (com Apagar). |
| `catalogo/form-item.tsx` | Formulário de item (nome, preço, "cobrado por"). |
| `catalogo/actions.ts` | `salvarItem`, `apagarItem`. |
| `configuracoes/page.tsx` | Tela **Ajustes**: logo, dados da empresa, cobrança e "Sair do sistema". |
| `configuracoes/form-empresa.tsx` | Nome, telefone, condição de pagamento, validade e mensagem de envio (com exemplo ao vivo). |
| `configuracoes/form-cobranca.tsx` | Prazos (1ª, 2ª, desistir) e os 4 modelos de cobrança. |
| `configuracoes/logo.tsx` | Enviar/trocar/remover logo; reduz a imagem no navegador (512px, PNG). |
| `configuracoes/actions.ts` | `salvarEmpresa`, `salvarCobranca`, `salvarLogo` (confere se é mesmo PNG/JPG/WebP), `removerLogo`. |

**Público, sem login**
| Arquivo | O que faz |
|---|---|
| `src/app/orcamento/[token]/page.tsx` | A página que o cliente final abre (passo 3): documento com logo, dados, itens, total, condições, "Responder no WhatsApp" (se a empresa tem celular) e "Baixar PDF". |
| `src/app/orcamento/[token]/botao-pdf.tsx` | O botão "Baixar PDF". |
| `src/app/orcamento/[token]/escolha.tsx` | Orçamento com opções, no navegador: guarda a escolha, mostra grupos e adicionais com botões grandes, o total ao vivo, o aviso "Sua escolha foi salva" e os botões WhatsApp/PDF que salvam antes de sair. |
| `src/app/orcamento/[token]/actions.ts` | `salvarEscolha`: a ação **pública** que grava a escolha do cliente (ver passo 3, item 6). |
| `src/app/orcamento/[token]/blocos.tsx` | Peças usadas nos dois modos da página: caixa do total e botão "Responder no WhatsApp". |
| `src/app/orcamento/[token]/not-found.tsx` | Mensagem para o cliente quando o link está errado (sem caminho para o login). |
| `src/app/orcamento/[token]/pdf/route.ts` | Gera e devolve o PDF (`orcamento-14-oficina-silva.pdf`). |
| `src/app/orcamento/[token]/pdf/documento-pdf.tsx` | O desenho do PDF em A4 (biblioteca `@react-pdf/renderer`, não é HTML; só aceita logo PNG/JPG). |
| `src/app/logo/[empresaId]/route.ts` | Entrega a imagem do logo guardada no banco (`/logo/<empresaId>`). |

### Arquivos públicos (`public/`)
| Arquivo | O que faz |
|---|---|
| `icone.png`, `apple-icone.png`, `favicon.ico`, `icone.svg` | Ícone neutro do sistema (quadrado azul com documento), usado quando a empresa não tem logo. `icone.svg` é o desenho original. |
| `og-padrao.png` | Imagem neutra da prévia de link no WhatsApp quando a empresa não tem logo. |

### Scripts de terminal (`scripts/`)
| Arquivo | O que faz |
|---|---|
| `criar-empresa.ts` | Cadastra empresa + login (`npm run criar-empresa` / `:producao`). |
| `demo/motor.ts` | O "motor" das demonstrações: recebe os dados de uma empresa fictícia e cria tudo (logo, catálogo, clientes, orçamentos com datas a partir de hoje, 3 para cobrar hoje; aceita orçamentos com opções e o histórico de escolhas do cliente). Para criar uma demo de outro ramo, copie um `demo-*.ts` e troque só os dados. |
| `demo-oficina.ts` | Dados da Oficina Silva: 12 clientes, 25 itens, 18 orçamentos (`npm run demo` / `:producao`). |
| `demo-marcenaria.ts` | Dados da Madeira Nobre, marcenaria de móveis sob medida e montagem: 12 clientes, 30 itens, 18 orçamentos, um deles com opções (Thiago: o cliente escolhe o material) (`npm run demo:marcenaria` / `:producao`). Login `demo@madeiranobre.com.br`. |
| `demo/logo-oficina-silva.png`, `demo/logo-madeira-nobre.png` | Logos das empresas de demonstração. |
| `teste-isolamento.ts` | Teste de vazamento: cria as empresas de teste A e B e, logada como A, tenta abrir, listar e alterar dados da B (repetindo chamadas reais trocando o código do registro). Confere no banco que nada da B mudou. Também confere que o **custo** não aparece na página pública nem no PDF (com e sem opções), e ataca a escolha de opções (itens de outro orçamento, escolha inválida, prévia do dono, orçamento fechado). Apaga as empresas de teste no fim. Usa `puppeteer-core` e o Google Chrome. |

---

## 6. Onde mexer para...

| Quero... | Onde |
|---|---|
| Cadastrar um cliente pagante novo | `npm run criar-empresa:producao` |
| Mudar cores, botões, tamanhos | `src/app/globals.css` (cor `marca`) e `src/components/estilos.ts` |
| Mudar os textos padrão das mensagens | Empresas novas: `@default(...)` em `prisma/schema.prisma` (+ migration). Empresas existentes: tela Ajustes de cada uma. |
| Mudar a regra de cobrança | `src/lib/cobranca.ts` (os prazos em si ficam nos Ajustes de cada empresa) |
| Mudar como funcionam as opções (grupo, padrão, total) | `src/lib/opcoes.ts`; a tela do cliente em `src/app/orcamento/[token]/escolha.tsx` |
| Mudar o que conta como "cliente abriu" | `src/lib/abertura.ts` |
| Mudar a página que o cliente vê | `src/app/orcamento/[token]/page.tsx` (e o PDF em `pdf/documento-pdf.tsx`, para ficarem iguais) |
| Adicionar um campo ao orçamento | `schema.prisma` + migration → `orcamentos/actions.ts` → `form-orcamento.tsx` → telas `orcamentos/[id]`, página pública e PDF |
| Adicionar um status | `enum StatusOrcamento` no schema (+ migration) e `src/lib/status.ts` |
| Adicionar um aviso de "salvo" | `MENSAGENS` em `src/components/aviso.tsx` e `redirect("...?ok=codigo")` na ação |

---

## 7. Problemas conhecidos e dicas

- **Login volta para a tela de entrada no Mac:** você rodou `npm start`. Use `npm run dev`.
- **`PrismaClientValidationError` depois de mudar o banco:** reinicie o `npm run dev` (Ctrl+C e rodar de novo).
- **Visual estranho ou botão invisível no Safari durante o desenvolvimento:** recarregue com Cmd+Shift+R.
- **Testar no celular em casa:** o celular precisa estar no mesmo Wi-Fi. Descubra o IP do Mac
  com `ipconfig getifaddr en0` e abra `http://<IP>:3000`. O IP muda de vez em quando. Pelo IP
  o login é pedido de novo (o navegador trata como outro site).
- **Links enviados pelo sistema rodando no Mac** só funcionam na sua rede e não geram prévia no
  WhatsApp. Para clientes, use sempre o site publicado.
- **Prévia do WhatsApp desatualizada:** o WhatsApp guarda a prévia de cada link já enviado;
  envios novos saem certos.
- **`npm audit` mostra alertas "altos":** todos na ferramenta de terminal do Prisma (não no site).
  Atualizar o Prisma quando sair a versão corrigida.

---

## 8. Decisões tomadas e ideias para depois

- **Vercel Hobby → Pro** quando entrar o primeiro cliente pagante (regra de uso da Vercel).
- **Envio automático de cobranças** só seria possível de forma segura pela API oficial do
  WhatsApp (Meta), que cobra por mensagem e exige aprovação dos textos. Ideia de plano premium.
- **Um link de orçamento não pode ser "cancelado"**: quem tem o link vê para sempre. Se precisar,
  criar um botão "gerar novo link" (sortear outro `token`).
- **Bloqueio de login** (5 erros → 15 min) pode ser usado para trancar a conta de alguém por
  15 minutos. Troca aceita em nome da segurança.
- A taxa de fechamento conta **os enviados no mês que fecharam** (fica sempre entre 0% e 100%).
