/**
 * `/llms.txt`: el índice de la casa para quien la lee con una IA.
 *
 * Un modelo que aterriza en estrenala.com tiene que adivinar de qué va esto a
 * partir de una landing llena de menús. Este archivo se lo dice en veinte
 * líneas y le deja el mapa: qué somos, qué hacemos, qué NO hacemos y dónde está
 * cada artículo.
 *
 * Es una convención joven (llmstxt.org) y conviene decirlo sin adornos: Google
 * ha dicho públicamente que la ignora, y con los demás no hay pruebas sólidas.
 * Se pone porque cuesta un archivo de texto y porque escribir en dos párrafos
 * qué eres nunca ha sido tiempo perdido — no porque vaya a traer visitas.
 *
 * Los enlaces apuntan a las direcciones DE VERDAD, las que ve una persona, no a
 * una copia en `/md`. Las mismas URLs devuelven Markdown a quien lo pide por la
 * cabecera `Accept` (ver rutas.ts), así que no hace falta una segunda dirección
 * para cada página — y si un modelo acaba citándonos, cita la buena.
 */
import { IDIOMAS, IDIOMA_POR_DEFECTO, NOMBRE_IDIOMA, rutaDeIdioma } from "@/src/i18n/idiomas";
import { ARTICULOS, rutaArticulo, RUTA_BLOG, DESCRIPCION_BLOG } from "@/src/blog-estrenala/indice";
import { textosLanding } from "@/src/i18n/landing";

const absoluta = (base: string, ruta: string) => new URL(ruta, base).toString();

/**
 * Lo que NO hacemos, dicho a propósito.
 *
 * Es la parte que más falta le hace a un modelo. Sin ella, a quien pregunte
 * «¿dónde subo la app de Next.js que me ha hecho Claude?» le pueden contestar
 * que aquí, y esa persona llega, no le funciona y se va pensando que la
 * plataforma está rota. Decir dónde acaba lo tuyo es parte de describirlo.
 */
const LIMITES = [
  "Se publican webs estáticas: HTML, CSS, imágenes y JavaScript de navegador.",
  "NO se ejecuta código en servidor: una app de Next.js, PHP o Python no se puede alojar aquí.",
  "Los formularios de contacto sí funcionan: los recoge la plataforma y te los manda por correo.",
  "El blog y el asistente de edición con IA son opcionales y funcionan con la clave del propio usuario.",
];

export function textoLlms(base: string): string {
  const t = textosLanding(IDIOMA_POR_DEFECTO);

  const otrosIdiomas = IDIOMAS.filter((i) => i !== IDIOMA_POR_DEFECTO).map(
    (i) => `- [${NOMBRE_IDIOMA[i]}](${absoluta(base, rutaDeIdioma(i))}): la misma página en ${NOMBRE_IDIOMA[i]}.`
  );

  const articulos = ARTICULOS.map(
    (a) => `- [${a.titulo}](${absoluta(base, rutaArticulo(a.slug))}): ${a.descripcion}`
  );

  return [
    "# Estrénala",
    `> ${t.meta.descripcion}`,
    `Estrénala (${new URL(base).host}) es una plataforma española para publicar y mantener webs hechas con IA.\n` +
      "Quien usa Claude, ChatGPT, v0 o similares acaba con un archivo HTML o un ZIP en su ordenador y sin\n" +
      "saber qué hacer con él. Aquí lo arrastra y queda online con dirección propia y HTTPS, sin instalar\n" +
      "nada ni tocar código. Después puede editarlo haciendo clic sobre la propia página, con historial\n" +
      "para volver atrás, o seguir editando en su herramienta de IA y volver a subir el ZIP.",
    ["## Lo que hace y lo que no", ...LIMITES.map((l) => `- ${l}`)].join("\n"),
    ["## Páginas",
      `- [Inicio](${absoluta(base, "/")}): ${t.meta.descripcion}`,
      `- [Blog](${absoluta(base, RUTA_BLOG)}): ${DESCRIPCION_BLOG}`,
    ].join("\n"),
    ["## Artículos", ...articulos].join("\n"),
    ["## Otros idiomas", ...otrosIdiomas].join("\n"),
    ["## Notas",
      "- Cualquiera de estas direcciones devuelve Markdown si se pide con la cabecera `Accept: text/markdown`.",
      `- Condiciones de uso del contenido, en [robots.txt](${absoluta(base, "/robots.txt")}) (Content-Signal).`,
      `- Mapa del sitio: ${absoluta(base, "/sitemap.xml")}`,
    ].join("\n"),
  ].join("\n\n") + "\n";
}
