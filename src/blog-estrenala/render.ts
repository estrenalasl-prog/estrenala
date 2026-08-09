import { mdAHtml } from "@/src/blog/markdown";
import { minutosDeLectura, type Articulo } from "./tipos";
import { rutaArticulo, RUTA_BLOG } from "./indice";
import { insertarFiguras } from "./figuras";

/** La portada de un artículo, como ruta. Absoluta la hace quien la necesite. */
export function rutaPortada(slug: string): string {
  return `${rutaArticulo(slug)}/portada.png`;
}

/**
 * El cuerpo en HTML, con las tablas metidas en una caja que se desplaza sola.
 *
 * Una tabla de cuatro columnas no cabe en un móvil, y sin esto lo que se
 * desplaza en horizontal es la PÁGINA ENTERA: el titular se sale por un lado y
 * el texto se lee a medias. Es más fácil de arreglar aquí, una vez, que
 * recordarlo al escribir cada artículo.
 */
export function cuerpoAHtml(md: string): string {
  /*
   * Las figuras se meten DESPUÉS de pasar por Markdown, nunca antes.
   *
   * Antes se hacía al revés y se rompió el 2026-08-09: en Markdown, una LÍNEA EN
   * BLANCO termina un bloque de HTML. El SVG las tiene entre secciones para que
   * se pueda leer, así que marked lo cortaba por la primera: el `</svg>` no
   * llegaba nunca y la mitad del dibujo salía fuera, como texto suelto debajo.
   *
   * Metiéndolo después, el SVG no pasa por el conversor y da igual cómo esté
   * escrito. `insertarFiguras` se come el `<p>` que marked le pone alrededor al
   * marcador, así que el `<figure>` sigue saliendo como bloque suelto.
   */
  const html = mdAHtml(md)
    .replace(/<table>/g, '<div class="tabla-scroll"><table>')
    .replace(/<\/table>/g, "</table></div>");
  return insertarFiguras(conAnclas(html));
}

/**
 * Un identificador de URL a partir de un texto: «La parte que de verdad se
 * atraganta: el dominio» → `la-parte-que-de-verdad-se-atraganta-el-dominio`.
 *
 * Sin acentos ni eñes: son válidos en una URL moderna, pero al copiar el enlace
 * y pegarlo en WhatsApp salen convertidos en `%C3%B1` y el enlace se vuelve
 * ilegible justo cuando alguien lo está compartiendo.
 */
export function anclaDe(texto: string): string {
  return texto
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Le pone `id` a cada `<h2>` para poder enlazar a una sección concreta.
 *
 * Hace falta para tres cosas: que se pueda mandar «mira este trozo» por
 * WhatsApp, que Google pueda ofrecer los saltos a secciones dentro del
 * resultado, y que el `scroll-margin-top` del CSS deje el título a la vista en
 * vez de pegado al borde de arriba.
 *
 * Dos secciones con el mismo título darían el mismo identificador y el enlace
 * llevaría siempre a la primera: a la segunda se le pone `-2`.
 */
export function conAnclas(html: string): string {
  const usados = new Map<string, number>();
  return html.replace(/<h2>([\s\S]*?)<\/h2>/g, (_o, dentro: string) => {
    const limpio = dentro.replace(/<[^>]+>/g, "").trim();
    const raiz = anclaDe(limpio) || "seccion";
    const n = (usados.get(raiz) ?? 0) + 1;
    usados.set(raiz, n);
    const id = n === 1 ? raiz : `${raiz}-${n}`;
    return `<h2 id="${id}">${dentro}</h2>`;
  });
}

/**
 * Lo que se le cuenta a Google en JSON-LD.
 *
 * Tres cosas en un solo bloque:
 *  - `Article`, para que sepa que esto es un artículo y de cuándo es.
 *  - `FAQPage`, que es lo que hace que las preguntas salgan DESPLEGADAS debajo
 *    del resultado en el buscador. Sale de las mismas preguntas que se pintan en
 *    la página: si se declarara aparte, tarde o temprano dirían cosas distintas,
 *    y una FAQ declarada que no está en la página es motivo de penalización.
 *  - `BreadcrumbList`, la miga de pan que Google enseña en vez de la URL cruda.
 */
export function datosEstructurados(a: Articulo, base: string): object {
  const url = new URL(rutaArticulo(a.slug), base).toString();
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Article",
        headline: a.titulo,
        description: a.descripcion,
        datePublished: a.fecha,
        dateModified: a.fecha,
        inLanguage: "es-ES",
        mainEntityOfPage: { "@type": "WebPage", "@id": url },
        author: { "@type": "Organization", name: "Estrénala", url: base },
        publisher: {
          "@type": "Organization",
          name: "Estrénala",
          logo: { "@type": "ImageObject", url: new URL("/brand/logo-tinta.png", base).toString() },
        },
        image: [new URL(rutaPortada(a.slug), base).toString()],
        wordCount: a.cuerpo.trim().split(/\s+/).filter(Boolean).length,
        timeRequired: `PT${minutosDeLectura(a.cuerpo)}M`,
      },
      {
        "@type": "FAQPage",
        mainEntity: a.preguntas.map((q) => ({
          "@type": "Question",
          name: q.p,
          acceptedAnswer: { "@type": "Answer", text: q.r },
        })),
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Inicio", item: base },
          { "@type": "ListItem", position: 2, name: "Blog", item: new URL(RUTA_BLOG, base).toString() },
          { "@type": "ListItem", position: 3, name: a.titulo, item: url },
        ],
      },
    ],
  };
}
