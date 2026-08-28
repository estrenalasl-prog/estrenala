/**
 * Qué le servimos a un agente de IA, y en qué dirección.
 *
 * Cuando alguien busca «cómo publicar la web que me hizo ChatGPT», cada vez más
 * veces no lo escribe en Google: se lo pregunta a ChatGPT. Y para que la
 * respuesta nos cite, un modelo tiene que poder LEER lo que escribimos. El HTML
 * de una landing es media página de menús, banners y JavaScript alrededor del
 * párrafo que importa; la misma página en Markdown es el párrafo.
 *
 * Así que servimos las dos: HTML a los navegadores y Markdown a quien lo pida
 * por la cabecera `Accept`. Es el mismo contenido, no una versión especial para
 * robots — eso sería «cloaking» y Google lo penaliza con razón.
 *
 * Módulo puro y sin dependencias: lo usa el middleware, que corre en Edge.
 */

/** Bajo dónde vive la versión en Markdown de cada página. */
export const PREFIJO_MD = "/md";

export const TIPO_MD = "text/markdown; charset=utf-8";

/** Los idiomas de la landing que tienen dirección propia (`/en`, `/pt`…). */
const IDIOMAS_CON_RUTA = ["en", "pt", "fr", "it"];

/**
 * Un slug de artículo. Deliberadamente estrecho: lo que llegue aquí se pega
 * dentro de una ruta que luego se reescribe, así que solo pasan minúsculas,
 * números y guiones.
 */
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** La calidad (`q=`) de un tipo dentro de la cabecera `Accept`. `null` si no está. */
function calidad(accept: string, tipo: string): number | null {
  for (const trozo of accept.split(",")) {
    const [medio, ...params] = trozo.split(";").map((s) => s.trim().toLowerCase());
    if (medio !== tipo) continue;
    const q = params.find((p) => p.startsWith("q="));
    if (!q) return 1;
    const n = Number(q.slice(2));
    return Number.isFinite(n) ? n : 1;
  }
  return null;
}

/**
 * ¿Nos están pidiendo Markdown?
 *
 * Tiene que estar escrito `text/markdown` EXPRESAMENTE. Un navegador manda
 * `text/html` y, al final, el comodín «cualquier cosa» con q=0.8. Ese comodín
 * significa «lo que tengas», no «prefiero Markdown»: servírselo por él le
 * dejaría la web en texto plano por pantalla.
 *
 * Y si además pide HTML con más prioridad, gana el HTML: es lo que dice la
 * cabecera y no nos toca a nosotros discutirlo.
 */
export function aceptaMarkdown(accept: string | null | undefined): boolean {
  if (!accept) return false;
  const md = calidad(accept, "text/markdown");
  if (md === null || md <= 0) return false;
  const html = calidad(accept, "text/html");
  return html === null || md >= html;
}

/**
 * La versión en Markdown de una página nuestra, si la tiene.
 *
 * Solo las páginas de CONTENIDO: las cinco landings y el blog. El panel no —
 * está tras la sesión y no hay nada que citar—, ni las legales, que se leen
 * enteras o no se leen.
 */
export function rutaMarkdown(pathname: string): string | null {
  if (pathname === "/") return PREFIJO_MD;
  const segmentos = pathname.split("/").filter(Boolean);
  if (segmentos.length === 1 && IDIOMAS_CON_RUTA.includes(segmentos[0])) {
    return `${PREFIJO_MD}/${segmentos[0]}`;
  }
  if (segmentos[0] !== "blog") return null;
  if (segmentos.length === 1) return `${PREFIJO_MD}/blog`;
  if (segmentos.length === 2 && SLUG.test(segmentos[1])) return `${PREFIJO_MD}/blog/${segmentos[1]}`;
  return null;
}

/**
 * La página a la que corresponde una ruta de `/md`. Es la vuelta de
 * `rutaMarkdown`, y la usa el route handler para saber qué tiene que escribir.
 */
export function paginaDeSegmentos(segmentos: string[] | undefined): string {
  return "/" + (segmentos ?? []).join("/");
}
