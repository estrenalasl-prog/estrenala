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

/**
 * Los otros artículos, para el «Sigue leyendo» del final.
 *
 * No es relleno: es lo que enlaza unos artículos con otros. Sin enlaces entre
 * ellos, cada uno es una isla — Google reparte peor la autoridad y quien acaba
 * de leer uno no tiene a dónde ir. Con un solo artículo devuelve una lista
 * vacía y la sección no se pinta; en cuanto haya un segundo, aparece sola.
 */
export function otrosArticulos(slug: string, cuantos = 2): Articulo[] {
  return ARTICULOS.filter((a) => a.slug !== slug).slice(0, cuantos);
}
