import type { Articulo } from "./tipos";
import { publicarWebHechaConIa } from "./posts/publicar-web-hecha-con-ia";
import { formularioContactoNoEnvia } from "./posts/formulario-contacto-no-envia";
import { conectarDominioRegistrosDns } from "./posts/conectar-dominio-registros-dns";
import { webIaPosicionarGoogle } from "./posts/web-ia-posicionar-google";
import { cambiarTextoSinTocarCodigo } from "./posts/cambiar-texto-sin-tocar-codigo";
import { puedoDescargarMiWeb } from "./posts/puedo-descargar-mi-web";
import { webSeVeMalEnElMovil } from "./posts/web-se-ve-mal-en-el-movil";
import { puedeChatgptRecomendarTuWeb } from "./posts/puede-chatgpt-recomendar-tu-web";
import { publicarWebV0LovableBolt } from "./posts/publicar-web-v0-lovable-bolt";
import { webLovableDatosAbiertos } from "./posts/web-lovable-datos-abiertos";

/**
 * TODOS los artículos, del más nuevo al más viejo — incluidos los que todavía
 * no toca publicar.
 *
 * Ojo con usar esta lista para pintar nada de cara al público: lleva dentro los
 * que tienen fecha por delante. Para eso está `articulosPublicados()`, que es lo
 * que usan el blog, el sitemap y la versión para agentes. Esta se queda entera
 * porque los tests tienen que validar también los que están esperando turno: un
 * borrador con la descripción demasiado larga hay que cazarlo al escribirlo, no
 * el viernes que sale solo.
 *
 * Se ordena aquí y no en cada página para que el listado, el sitemap y los
 * «siguiente / anterior» no puedan discrepar entre ellos. Con la misma fecha
 * manda el orden de esta lista, así que lo primero es lo que queremos que se lea
 * primero.
 */
export const ARTICULOS: Articulo[] = [
  webLovableDatosAbiertos,
  publicarWebV0LovableBolt,
  puedeChatgptRecomendarTuWeb,
  webSeVeMalEnElMovil,
  puedoDescargarMiWeb,
  publicarWebHechaConIa,
  formularioContactoNoEnvia,
  cambiarTextoSinTocarCodigo,
  conectarDominioRegistrosDns,
  webIaPosicionarGoogle,
].sort((a, b) => b.fecha.localeCompare(a.fecha));

/**
 * Los que YA se pueden leer: todos menos los que tienen fecha por delante.
 *
 * Existe para poder escribir con adelanto. Antes no se podía: al no filtrar
 * nada, un artículo fechado el viernes aparecía el día que se desplegara, con
 * el viernes escrito debajo del título — o sea que la fecha había que ponerla
 * siempre «hoy» y publicar era desplegar a mano el día justo. Con esto se
 * escriben varios de una sentada y cada uno sale solo cuando le toca.
 *
 * Es una FUNCIÓN y no una constante a propósito, y es la parte fácil de hacer
 * mal: una constante se calcula la primera vez que se importa el módulo y se
 * queda así mientras el proceso viva. En un contenedor que lleva días
 * levantado, el artículo del viernes no aparecería hasta el siguiente
 * despliegue, que es exactamente el problema que se venía a quitar. Las páginas
 * del blog son `force-dynamic`, así que preguntarlo en cada visita sale gratis.
 *
 * Se compara texto con texto (`YYYY-MM-DD`), que ordena igual que la fecha y no
 * arrastra husos horarios: `new Date("2026-09-11")` es medianoche UTC, y en
 * España eso son las dos de la madrugada del día siguiente en verano.
 */
export function articulosPublicados(hoy = new Date().toISOString().slice(0, 10)): Articulo[] {
  return ARTICULOS.filter((a) => a.fecha <= hoy);
}

/**
 * Un artículo por su dirección. Los que aún no toca NO se encuentran: si no,
 * bastaría con acertar el slug para leer lo que todavía no está publicado, y el
 * enlace correría antes de tiempo.
 */
export function articuloPorSlug(slug: string, hoy?: string): Articulo | undefined {
  return articulosPublicados(hoy).find((a) => a.slug === slug);
}

export const RUTA_BLOG = "/blog";

/**
 * El título y la descripción del índice del blog.
 *
 * Viven aquí y no dentro de `app/blog/page.tsx` porque los necesita también la
 * versión en Markdown que se les sirve a los agentes de IA (ver `src/agentes/`),
 * y un route handler no puede importar una página: se traería el CSS con ella.
 * Con dos copias, la que nadie mira se queda vieja.
 */
export const TITULO_BLOG = "Blog — Estrénala";
export const DESCRIPCION_BLOG =
  "Cómo publicar una web hecha con IA, conectar un dominio y no romperla después. Escrito para quien no programa.";

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
export function otrosArticulos(slug: string, cuantos = 2, hoy?: string): Articulo[] {
  return articulosPublicados(hoy).filter((a) => a.slug !== slug).slice(0, cuantos);
}
