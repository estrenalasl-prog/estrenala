import type { MetadataRoute } from "next";
import { urlPlataforma } from "@/src/config/sitio";
import { sitemapPlataforma } from "@/src/config/sitemap-plataforma";

// Dinámico por lo mismo que robots.ts: la dirección sale del entorno del
// servidor, y estático se quedaría congelada la del build (donde no hay .env).
export const dynamic = "force-dynamic";

export default function sitemap(): MetadataRoute.Sitemap {
  // `lastModified` solo donde hay una fecha DE VERDAD (los artículos traen la
  // suya, las legales publican la suya). Las landings siguen sin ella: mentir
  // sobre cuándo cambió algo es peor que callarlo, y `new Date()` en cada visita
  // le diría a Google que TODO cambia siempre. El porqué, en sitemap-plataforma.
  return sitemapPlataforma(urlPlataforma());
}
