import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Orçamentos",
  description: "Orçamentos rápidos para pequenas empresas",
  // Impede o Safari do iPhone de transformar números de telefone em links por conta
  // própria (isso muda a página depois de carregada e o React acusa "Hydration failed").
  // Onde quisermos um link de ligação, colocamos nós mesmos.
  formatDetection: { telephone: false, email: false, address: false },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="pt-BR"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans">{children}</body>
    </html>
  );
}
