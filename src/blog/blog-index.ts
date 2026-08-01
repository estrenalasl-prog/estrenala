import { renderTemplate } from "./template";

export type PostIndice = {
  titulo: string;
  slug: string;
  metaDescripcion: string;
  fecha: string;     // legible: «1 de agosto de 2026»
  fechaIso: string;  // para <time datetime>: «2026-08-01»
  imagen: string;
};

const INICIO = "<!--POST-->";
const FIN = "<!--/POST-->";

export function renderIndex(tplIndex: string, posts: PostIndice[]): string {
  const i = tplIndex.indexOf(INICIO);
  const f = tplIndex.indexOf(FIN);
  if (i === -1 || f === -1 || f < i) {
    throw new Error("La plantilla de índice debe contener los marcadores <!--POST--> y <!--/POST-->");
  }
  const itemTpl = tplIndex.slice(i + INICIO.length, f);
  const items = posts.map((p) => renderTemplate(itemTpl, {
    titulo: p.titulo,
    slug: p.slug,
    meta_descripcion: p.metaDescripcion,
    fecha: p.fecha,
    fecha_iso: p.fechaIso,
    imagen: p.imagen,
  })).join("");
  return tplIndex.slice(0, i) + items + tplIndex.slice(f + FIN.length);
}
