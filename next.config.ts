import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Salida autocontenida para la imagen Docker (Dokploy).
  output: "standalone",
  // El rasterizador de portadas es WASM: se queda fuera del bundle (Turbopack
  // intenta procesar el .wasm y casca con «Can't resolve 'wbg'») y Node lo
  // carga de node_modules en runtime.
  serverExternalPackages: ["@resvg/resvg-wasm"],
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

  // Las cabeceras de seguridad NO van aquí, sino en middleware.ts.
  //
  // `headers()` casa contra la ruta que ENTRA, y las webs publicadas de los
  // clientes entran por "/" con su propio Host: el rewrite a /sites/... lo hace
  // el middleware después. O sea que desde aquí no hay forma de distinguirlas, y
  // colarles estas cabeceras sería grave: un `Strict-Transport-Security` con
  // includeSubDomains sobre el dominio de un cliente le obliga a HTTPS TODO su
  // dominio, subdominios que no servimos nosotros incluidos. En el middleware sí
  // se sabe si el host es la plataforma.
};

export default nextConfig;
