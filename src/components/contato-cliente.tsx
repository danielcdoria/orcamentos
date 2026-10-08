// Atalhos de um cliente: abrir a conversa no WhatsApp (wa.me, sem mensagem pronta) e
// abrir o site de demonstração. Só aparecem se houver telefone válido / link da demo.
// São links comuns: o sistema não manda nada sozinho, quem toca é a pessoa.
import { Globe, MessageCircle } from "lucide-react";
import { telefoneParaWhatsApp } from "@/lib/telefone";
import { estiloBotaoSecundario } from "@/components/estilos";

type Props = {
  nome: string;
  telefone: string | null;
  linkDemo: string | null;
  compacto?: boolean; // na lista: só os ícones
};

export function ContatoCliente({ nome, telefone, linkDemo, compacto }: Props) {
  const numero = telefoneParaWhatsApp(telefone);
  // O link já é conferido ao salvar; conferir de novo aqui não custa (é um link clicável).
  const demo = linkDemo && /^https?:\/\//i.test(linkDemo) ? linkDemo : null;
  if (!numero && !demo) return null;

  const estilo = compacto
    ? "flex size-11 shrink-0 items-center justify-center rounded-full border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
    : `${estiloBotaoSecundario} flex-1`;

  const whatsapp = numero && (
    <a
      key="whatsapp"
      href={`https://wa.me/${numero}`}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={compacto ? `Abrir conversa no WhatsApp com ${nome}` : undefined}
      title={compacto ? "WhatsApp" : undefined}
      className={estilo}
    >
      <MessageCircle className="size-5 shrink-0 text-green-700" aria-hidden />
      {!compacto && "WhatsApp"}
    </a>
  );
  const botaoDemo = demo && (
    <a
      key="demo"
      href={demo}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={compacto ? `Ver demo de ${nome}` : undefined}
      title={compacto ? "Ver demo" : undefined}
      className={estilo}
    >
      <Globe className="size-5 shrink-0" aria-hidden />
      {!compacto && "Ver demo"}
    </a>
  );

  // Na lista, o WhatsApp fica sempre na ponta direita (mesmo lugar em todas as linhas)
  return (
    <div className={compacto ? "flex shrink-0 gap-2" : "flex gap-3"}>
      {compacto ? [botaoDemo, whatsapp] : [whatsapp, botaoDemo]}
    </div>
  );
}
