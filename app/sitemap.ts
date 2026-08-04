import type { MetadataRoute } from "next";
import { urlPlataforma } from "@/src/config/sitio";
import { sitemapPlataforma } from "@/src/config/sitemap-plataforma";

// Dinámico por lo mismo que robots.ts: la dirección sale del entorno del
// servidor, y estático se quedaría congelada la del build (donde no hay .env).
export const dynamic = "force-dynamic";

export default function sitemap(): MetadataRoute.Sitemap {
  // Sin `lastModified`: mentir sobre cuándo cambió algo es peor que callarlo, y
  // poner `new Date()` en cada visita le diría a Google que TODO cambia siempre.
  return sitemapPlataforma(urlPlataforma());
}
