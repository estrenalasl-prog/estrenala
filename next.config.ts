import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Fijamos la raíz del workspace para que Turbopack no la infiera mal por
  // lockfiles sueltos fuera del proyecto (p. ej. en la carpeta del usuario).
  turbopack: {
    root: process.cwd(),
  },
};

export default nextConfig;
