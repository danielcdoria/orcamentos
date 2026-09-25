import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    // Diz ao Next que a raiz do projeto é esta pasta, e não uma pasta acima
    // que por acaso tenha um package-lock.json (existe um vazio em ~/).
    root: path.join(__dirname),
  },
};

export default nextConfig;
