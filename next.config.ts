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



  // La barra final la decidimos NOSOTROS, no Next.
  //
  // Next normaliza siempre igual (`/blog/` → 308 → `/blog`), y para las webs de
  // los clientes esa regla única está mal la mitad de las veces, porque de la
  // barra final depende dónde caen sus enlaces RELATIVOS:
  //
  //   `blog/index.html` servido en `/blog`   → href="foto.html" cae en /foto.html      ✗
  //   `blog/index.html` servido en `/blog/`  → href="foto.html" cae en /blog/foto.html ✓
  //   `contacto.html`  servido en `/contacto`  → href="equipo.html" → /equipo.html      ✓
  //   `contacto.html`  servido en `/contacto/` → href="equipo.html" → /contacto/equipo.html ✗
  //
  // O sea que el índice de una carpeta la quiere y una URL limpia no. Por eso
  // `trailingSlash: true` tampoco vale: arregla el primer caso y rompe el
  // tercero. Se apaga la automática y cada camino la resuelve a su manera:
  // resolve-site.ts para las webs publicadas, middleware.ts para la plataforma
  // (que se queda como estaba: sin barra).
  skipTrailingSlashRedirect: true,

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
