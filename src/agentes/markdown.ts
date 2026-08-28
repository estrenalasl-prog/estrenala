/**
 * Las páginas de contenido, escritas en Markdown para quien las lee con una IA.
 *
 * Es EL MISMO texto que ve un visitante, sin el andamiaje: el mismo catálogo de
 * la landing y el mismo cuerpo de los artículos (que ya estaba en Markdown, así
 * que aquí no se convierte nada — se sirve tal cual se escribió). Si mañana
 * alguien cambia una respuesta de las preguntas frecuentes, cambia en los dos
 * sitios a la vez, porque la fuente es una.
 *
 * Eso es lo importante y es lo que lo hace legítimo: no es una versión para
 * robots con otra cosa dentro. Servir a un buscador algo distinto de lo que ve
 * la gente tiene nombre —cloaking— y se penaliza.
 */
import { esIdioma, rutaDeIdioma, IDIOMA_POR_DEFECTO, type Idioma } from "@/src/i18n/idiomas";
import { textosLanding } from "@/src/i18n/landing";
import {
  ARTICULOS, articuloPorSlug, rutaArticulo, RUTA_BLOG, TITULO_BLOG, DESCRIPCION_BLOG,
} from "@/src/blog-estrenala/indice";
import { fechaLarga, minutosDeLectura, type Articulo } from "@/src/blog-estrenala/tipos";
import { FIGURAS } from "@/src/blog-estrenala/figuras";

const absoluta = (base: string, ruta: string) => new URL(ruta, base).toString();

/**
 * Las marcas de formato del catálogo, quitadas.
 *
 * En la landing, `[[esto]]` se pinta resaltado en lima y `~~esto~~` tachado (ver
 * i18n/formato.tsx). En Markdown no significan eso: `~~` es texto BORRADO, y
 * «~~Subirla~~ te lleva semanas» le diría a un modelo justo lo contrario de lo
 * que pone. La negrita sí se queda, que en Markdown es la misma.
 */
export function sinMarcas(texto: string): string {
  return texto.replace(/\[\[(.+?)\]\]/g, "$1").replace(/~~(.+?)~~/g, "$1");
}

/**
 * Los dibujos, sustituidos por su pie.
 *
 * Un SVG de treinta líneas dentro del texto no le dice nada a un modelo, y el
 * marcador crudo (`{{figura:zona-dns}}`) menos todavía. El pie es la frase que
 * lee quien mira el dibujo, así que es exactamente lo que hay que dejar.
 */
export function figurasComoTexto(md: string): string {
  return md.replace(/\{\{figura:([a-z0-9-]+)\}\}/g, (original, nombre: string) => {
    const f = FIGURAS[nombre];
    return f ? `*(Figura: ${f.pie})*` : original;
  });
}

/** Una lista de preguntas y respuestas, como sección de Markdown. */
function preguntas(titulo: string, lista: readonly { p: string; r: string }[]): string {
  return [`## ${titulo}`, ...lista.map((q) => `### ${sinMarcas(q.p)}\n\n${sinMarcas(q.r)}`)].join("\n\n");
}

/** La landing, en el idioma que sea. */
function landing(idioma: Idioma, base: string): string {
  const t = textosLanding(idioma);
  const aqui = absoluta(base, rutaDeIdioma(idioma));

  return [
    `# ${t.meta.titulo}`,
    `> ${t.meta.descripcion}`,
    `${aqui}`,
    `${sinMarcas(t.hero.sub)}`,
    `## ${sinMarcas(t.problema.titulo)}`,
    `${sinMarcas(t.problema.texto)}`,
    `${sinMarcas(t.problema.firma)}`,
    `## ${sinMarcas(t.como.titulo)}`,
    `${sinMarcas(t.como.texto)}`,
    [
      `1. **${t.como.paso1Titulo}** — ${sinMarcas(t.como.paso1Texto)} (${t.como.paso1Chip})`,
      `2. **${t.como.paso2Titulo}** — ${sinMarcas(t.como.paso2Texto)} (${t.como.paso2Chip})`,
      `3. **${t.como.paso3Titulo}** — ${sinMarcas(t.como.paso3Texto)} (${t.como.paso3Chip})`,
    ].join("\n"),
    preguntas(sinMarcas(t.faq.titulo), t.faq.preguntas),
    "---",
    `- ${t.nav.blog}: ${absoluta(base, RUTA_BLOG)}`,
    `- llms.txt: ${absoluta(base, "/llms.txt")}`,
  ].join("\n\n") + "\n";
}

/** El índice del blog: de qué va cada artículo, para poder elegir cuál abrir. */
function indiceBlog(base: string): string {
  const fichas = ARTICULOS.map((a) =>
    [
      `### [${a.titulo}](${absoluta(base, rutaArticulo(a.slug))})`,
      `${a.fecha} · ${a.tema} · ${minutosDeLectura(a.cuerpo)} min`,
      a.descripcion,
    ].join("\n\n")
  );

  return [`# ${TITULO_BLOG}`, `> ${DESCRIPCION_BLOG}`, absoluta(base, RUTA_BLOG), ...fichas].join("\n\n") + "\n";
}

/** Un artículo entero: cabecera, cuerpo y sus preguntas. */
function articulo(a: Articulo, base: string): string {
  return [
    `# ${a.titulo}`,
    `> ${a.descripcion}`,
    `${absoluta(base, rutaArticulo(a.slug))} · ${fechaLarga(a.fecha)} · ${a.tema} · ${minutosDeLectura(a.cuerpo)} min de lectura`,
    a.entradilla,
    ["**Lo que te llevas:**", ...a.resumen.map((r) => `- ${r}`)].join("\n"),
    "---",
    figurasComoTexto(a.cuerpo.trim()),
    preguntas("Preguntas frecuentes", a.preguntas),
  ].join("\n\n") + "\n";
}

/**
 * El Markdown de una página nuestra, o `null` si esa página no tiene versión en
 * Markdown (que es lo mismo que decir: si no existe, o si no es de contenido).
 *
 * `ruta` es la dirección REAL de la página —`/`, `/en`, `/blog`, `/blog/loquesea`—,
 * no la de `/md`: quien pregunta ya ha deshecho el prefijo.
 */
export function markdownDeRuta(ruta: string, base: string): string | null {
  if (ruta === "/") return landing(IDIOMA_POR_DEFECTO, base);

  const segmentos = ruta.split("/").filter(Boolean);
  if (segmentos.length === 1 && esIdioma(segmentos[0]) && segmentos[0] !== IDIOMA_POR_DEFECTO) {
    return landing(segmentos[0], base);
  }
  if (segmentos[0] !== "blog") return null;
  if (segmentos.length === 1) return indiceBlog(base);
  if (segmentos.length > 2) return null;

  const a = articuloPorSlug(segmentos[1]);
  return a ? articulo(a, base) : null;
}
