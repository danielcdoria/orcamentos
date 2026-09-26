import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Só vale no modo de desenvolvimento (npm run dev): permite abrir o site pelo IP
  // do Mac na rede de casa (ex.: http://192.168.0.44:3000, pelo celular). Sem isso,
  // o Next bloqueia o JavaScript da página e nada que é interativo funciona.
  allowedDevOrigins: ["192.168.*.*"],
  // Cabeçalhos de proteção enviados em todas as páginas.
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          // Nenhum outro site pode mostrar o sistema dentro de uma "moldura" (iframe).
          // Evita o golpe de "clickjacking" (induzir cliques escondidos).
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
          // O navegador não tenta "adivinhar" o tipo de um arquivo (ex.: tratar imagem como script).
          { key: "X-Content-Type-Options", value: "nosniff" },
          // Ao sair para outro site, não envia o endereço completo (que pode ter o código do orçamento).
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // O sistema não usa câmera, microfone nem localização.
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
  turbopack: {
    // Diz ao Next que a raiz do projeto é esta pasta, e não uma pasta acima
    // que por acaso tenha um package-lock.json (existe um vazio em ~/).
    root: path.join(__dirname),
  },
};

export default nextConfig;
