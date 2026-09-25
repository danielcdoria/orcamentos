import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Só vale no modo de desenvolvimento (npm run dev): permite abrir o site pelo IP
  // do Mac na rede de casa (ex.: http://192.168.0.44:3000, pelo celular). Sem isso,
  // o Next bloqueia o JavaScript da página e nada que é interativo funciona.
  allowedDevOrigins: ["192.168.*.*"],
  turbopack: {
    // Diz ao Next que a raiz do projeto é esta pasta, e não uma pasta acima
    // que por acaso tenha um package-lock.json (existe um vazio em ~/).
    root: path.join(__dirname),
  },
};

export default nextConfig;
