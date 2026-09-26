-- AlterTable
ALTER TABLE "Empresa" ALTER COLUMN "mensagemEnvio" SET DEFAULT 'Olá {nome}, segue o orçamento que combinamos: {link}',
ALTER COLUMN "msgCobranca1Abriu" SET DEFAULT 'Oi, {nome}! Tudo certo? Vi que você deu uma olhada no orçamento. Ficou alguma dúvida ou quer ajustar alguma coisa? É só me falar que a gente acerta 🙂',
ALTER COLUMN "msgCobranca1NaoAbriu" SET DEFAULT 'Oi, {nome}! Tudo bem? Te mandei o orçamento da {empresa} há uns dias, mas acho que acabou se perdendo aí no meio das mensagens. Vou deixar o link de novo aqui: {link}',
ALTER COLUMN "msgCobranca2Abriu" SET DEFAULT 'Oi, {nome}! Queria saber se o orçamento ainda faz sentido pra você. Se o valor ou o prazo não encaixou, me conta que eu vejo o que dá pra fazer. Ele vale até {validade}.',
ALTER COLUMN "msgCobranca2NaoAbriu" SET DEFAULT 'Oi, {nome}, tudo bem? Passando só pra confirmar se o orçamento chegou certinho pra você. Ele fica válido até {validade}. O link é este: {link}';

-- AlterTable
ALTER TABLE "Orcamento" ALTER COLUMN "token" SET DEFAULT replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '');
