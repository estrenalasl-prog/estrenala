import type { Articulo } from "./tipos";
import { publicarWebHechaConIa } from "./posts/publicar-web-hecha-con-ia";
import { formularioContactoNoEnvia } from "./posts/formulario-contacto-no-envia";
import { conectarDominioRegistrosDns } from "./posts/conectar-dominio-registros-dns";
import { webIaPosicionarGoogle } from "./posts/web-ia-posicionar-google";
import { cambiarTextoSinTocarCodigo } from "./posts/cambiar-texto-sin-tocar-codigo";
import { puedoDescargarMiWeb } from "./posts/puedo-descargar-mi-web";

/**
 * Todos los artículos, del más nuevo al más viejo.
 *
 * Se ordena aquí y no en cada página para que el listado, el sitemap y los
 * «siguiente / anterior» no puedan discrepar entre ellos. Con la misma fecha
 * manda el orden de esta lista, así que lo primero es lo que queremos que se lea
 * primero.
 */
export const ARTICULOS: Articulo[] = [
  puedoDescargarMiWeb,
  publicarWebHechaConIa,
  formularioContactoNoEnvia,
  cambiarTextoSinTocarCodigo,
  conectarDominioRegistrosDns,
  webIaPosicionarGoogle,
].sort((a, b) => b.fecha.localeCompare(a.fecha));

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
