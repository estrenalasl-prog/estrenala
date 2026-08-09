import type { Articulo } from "./tipos";
import { publicarWebHechaConIa } from "./posts/publicar-web-hecha-con-ia";

/**
 * Todos los artículos, del más nuevo al más viejo.
 *
 * Se ordena aquí y no en cada página para que el listado, el sitemap y los
 * «siguiente / anterior» no puedan discrepar entre ellos.
 */
export const ARTICULOS: Articulo[] = [publicarWebHechaConIa].sort((a, b) =>
  b.fecha.localeCompare(a.fecha)
);

export function articuloPorSlug(slug: string): Articulo | undefined {
  return ARTICULOS.find((a) => a.slug === slug);
}

export const RUTA_BLOG = "/blog";

export function rutaArticulo(slug: string): string {
  return `${RUTA_BLOG}/${slug}`;
}
