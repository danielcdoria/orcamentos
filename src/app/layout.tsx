import type { Metadata, Viewport } from "next";
import "./globals.css";
import { urlBase } from "@/lib/url";

// Informações da página para o navegador e para prévias de link (WhatsApp etc.).
// Ícone e imagem de prévia NEUTROS do sistema; quando a empresa tem logo, as telas internas
// e a página do orçamento trocam pelo logo dela (ver (app)/layout.tsx e orcamento/[token]).
export async function generateMetadata(): Promise<Metadata> {
  return {
    metadataBase: new URL(await urlBase()), // para os endereços das imagens ficarem completos
    title: "Orçamentos",
    description: "Orçamentos rápidos para pequenas empresas",
    icons: { icon: "/icone.png", apple: "/apple-icone.png" },
    openGraph: { images: ["/og-padrao.png"] },
    // Impede o Safari do iPhone de transformar números de telefone em links por conta
    // própria (isso muda a página depois de carregada e o React acusa "Hydration failed").
    // Onde quisermos um link de ligação, colocamos nós mesmos.
    formatDetection: { telephone: false, email: false, address: false },
  };
}

export const viewport: Viewport = {
  themeColor: "#ffffff",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" className="h-full antialiased">
      <body className="flex min-h-full flex-col font-sans text-base">{children}</body>
    </html>
  );
}
