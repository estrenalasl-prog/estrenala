import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Salida autocontenida para la imagen Docker (Dokploy).
  output: "standalone",
  // La portada «diseño» se rasteriza a PNG en runtime leyendo estos archivos
  // del disco; con output standalone hay que declararlos o no viajan al Docker.
  outputFileTracingIncludes: {
    "/**": [
      "./src/blog/portada/fuentes/**",
      "./node_modules/@resvg/resvg-wasm/index_bg.wasm",
    ],
  },
  // Fijamos la raíz del workspace para que Turbopack no la infiera mal por
  // lockfiles sueltos fuera del proyecto (p. ej. en la carpeta del usuario).
  turbopack: {
    root: process.cwd(),
  },
};

export default nextConfig;
