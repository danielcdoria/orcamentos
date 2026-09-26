import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Orçamentos",
  description: "Orçamentos rápidos para pequenas empresas",
  // Impede o Safari do iPhone de transformar números de telefone em links por conta
  // própria (isso muda a página depois de carregada e o React acusa "Hydration failed").
  // Onde quisermos um link de ligação, colocamos nós mesmos.
  formatDetection: { telephone: false, email: false, address: false },
};

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
