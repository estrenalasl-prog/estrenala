import { mdAHtml } from "@/src/blog/markdown";
import { minutosDeLectura, type Articulo } from "./tipos";
import { rutaArticulo, RUTA_BLOG } from "./indice";

/**
 * El cuerpo en HTML, con las tablas metidas en una caja que se desplaza sola.
 *
 * Una tabla de cuatro columnas no cabe en un móvil, y sin esto lo que se
 * desplaza en horizontal es la PÁGINA ENTERA: el titular se sale por un lado y
 * el texto se lee a medias. Es más fácil de arreglar aquí, una vez, que
 * recordarlo al escribir cada artículo.
 */
export function cuerpoAHtml(md: string): string {
  return mdAHtml(md)
    .replace(/<table>/g, '<div class="tabla-scroll"><table>')
    .replace(/<\/table>/g, "</table></div>");
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
        image: [new URL("/brand/og.png", base).toString()],
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
