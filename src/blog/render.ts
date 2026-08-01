import { mdAHtml } from "./markdown";
import { renderTemplate } from "./template";
import type { PostIndice } from "./blog-index";
import { escapeAttr } from "@/src/editor/apply";

export type DatosPost = { titulo: string; slug: string; metaDescripcion: string; md: string; imagenExt: string };

const MESES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

/**
 * La fecha como la lee una persona: «1 de agosto de 2026».
 *
 * En el hueco `{{fecha}}` iba la fecha en crudo (`2026-08-01`), que es lo que
 * necesita Google en el JSON-LD pero NO lo que debe leer un visitante del blog
 * de un cliente. Se vio en la primera plantilla que se probó de verdad.
 *
 * Se formatea a mano y no con `toLocaleDateString`: la fecha viene como
 * `AAAA-MM-DD`, y convertirla a `Date` la sitúa a medianoche UTC, así que en
 * cualquier huso al oeste el artículo saldría fechado el día anterior. Aquí no
 * hay husos ni depende del idioma que tenga puesto el servidor.
 *
 * Lo que no sea una fecha se devuelve tal cual: nunca es peor que inventarse algo.
 */
export function fechaEnEspanol(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!m) return iso;
  const mes = MESES[Number(m[2]) - 1];
  return mes ? `${Number(m[3])} de ${mes} de ${m[1]}` : iso;
}

export function basePublica(
  p: { dominio: string | null; subdominio: string | null },
  sitesBaseDomain: string
): string | null {
  if (p.dominio) return `https://${p.dominio}`;
  if (p.subdominio) return `https://${p.subdominio}.${sitesBaseDomain}`;
  return null;
}

// Render determinista del artículo (la IA nunca toca esto). `imagenSrc` solo
// para la vista previa efímera (URL del asset o placeholder); el guardado real
// usa siempre /blog/img/<slug>.<ext>.
export function renderPost(tplPost: string, post: DatosPost, fecha: string, base: string, imagenSrc?: string): string {
  const imagen = `/blog/img/${post.slug}.${post.imagenExt}`;
  const canonical = `${base}/blog/${post.slug}.html`;
  const jsonLd = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.titulo,
    description: post.metaDescripcion,
    datePublished: fecha,
    image: `${base}${imagen}`,
    inLanguage: "es",
  }).replace(/<\//g, "<\\/");
  // Escape con escapeAttr (no escapeHtmlText) porque los huecos {{titulo}}, {{meta_descripcion}}, {{fecha}}
  // aparecen tanto en contextos de texto como en atributos (ej: og:title, og:description, alt);
  // escapeAttr protege ambos contextos escapando &, ", <.
  return renderTemplate(tplPost, {
    titulo: escapeAttr(post.titulo),
    contenido: mdAHtml(post.md),
    meta_descripcion: escapeAttr(post.metaDescripcion),
    imagen: imagenSrc ?? imagen,
    // `fecha` la lee una persona; `fecha_iso` la lee Google (en <time datetime>).
    fecha: escapeAttr(fechaEnEspanol(fecha)),
    fecha_iso: escapeAttr(fecha),
    canonical,
    json_ld: `<script type="application/ld+json">${jsonLd}</script>`,
  });
}

export function itemsIndice(
  posts: { titulo: string; slug: string; metaDescripcion: string; fecha: string; imagenExt: string }[]
): PostIndice[] {
  return posts.map((p) => ({
    titulo: escapeAttr(p.titulo),
    slug: p.slug,
    metaDescripcion: escapeAttr(p.metaDescripcion),
    fecha: escapeAttr(fechaEnEspanol(p.fecha)),
    fechaIso: escapeAttr(p.fecha),
    imagen: `/blog/img/${p.slug}.${p.imagenExt}`,
  }));
}

export const IMAGEN_EJEMPLO =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='1200' height='630'%3E%3Crect width='100%25' height='100%25' fill='%23e5e7eb'/%3E%3C/svg%3E";

export const DATOS_EJEMPLO: DatosPost = {
  titulo: "Título de ejemplo",
  slug: "titulo-de-ejemplo",
  metaDescripcion: "Así se verá la descripción del artículo en Google y al compartir.",
  md: "## Un apartado\n\nEste es un párrafo de ejemplo del artículo. Aquí iría tu contenido.\n\n- Un punto\n- Otro punto",
  imagenExt: "png",
};
