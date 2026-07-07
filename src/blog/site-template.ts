import { EditorError } from "@/src/editor/errors";
import { pedirJson, PlantillasSchema } from "@/src/ia/claude";
import { huecosSinRellenar } from "./template";
import type { StorageAdapter } from "@/src/storage/types";
import type { ProjectStore } from "@/src/repositories/types";

const HUECOS_POST = ["titulo", "meta_descripcion", "contenido", "imagen", "fecha", "canonical", "json_ld"];
const HUECOS_INDEX = ["titulo", "slug", "meta_descripcion", "fecha", "imagen"];
export const MSG_SIN_PLANTILLA = "El proyecto no tiene plantilla de blog (créala en la sección Blog)";

export function validarPlantillas(tplPost: string, tplIndex: string): string[] {
  const errores: string[] = [];
  const presentes = huecosSinRellenar(tplPost);
  if (!["titulo", "meta_descripcion", "contenido"].every((h) => presentes.includes(h))) {
    errores.push("La plantilla de artículo debe contener los huecos {{titulo}}, {{meta_descripcion}} y {{contenido}}");
  }
  const i = tplIndex.indexOf("<!--POST-->");
  const f = tplIndex.indexOf("<!--/POST-->");
  if (i === -1 || f === -1 || f < i) {
    errores.push("La plantilla de índice debe contener los marcadores <!--POST--> y <!--/POST-->");
  }
  const desconocidos = [...new Set([
    ...presentes.filter((h) => !HUECOS_POST.includes(h)),
    ...huecosSinRellenar(tplIndex).filter((h) => !HUECOS_INDEX.includes(h)),
  ])];
  if (desconocidos.length) errores.push(`La plantilla usa huecos desconocidos: ${desconocidos.join(", ")}`);
  return errores;
}

// Normaliza un href de hoja de estilo a ruta ABSOLUTA desde la raíz del sitio,
// resolviéndolo respecto al directorio de la portada y colapsando "." y "..".
function aRootAbsoluto(entryPath: string, href: string): string {
  const base = href.startsWith("/")
    ? href.slice(1)
    : (entryPath.includes("/") ? entryPath.slice(0, entryPath.lastIndexOf("/") + 1) : "") + href;
  const partes: string[] = [];
  for (const seg of base.split("/")) {
    if (seg === "..") partes.pop();
    else if (seg && seg !== ".") partes.push(seg);
  }
  return "/" + partes.join("/");
}

// Lee la portada del snapshot actual y pide a Claude las dos plantillas. El blog
// se sirve DENTRO del mismo sitio, así que las plantillas ENLAZAN sus hojas de
// estilo (rutas absolutas desde la raíz) en vez de incrustarlas: la salida es
// pequeña, rápida y barata, y evita que el JSON se trunque. No persiste nada:
// el usuario revisa y guarda con PUT.
export async function generarPlantillas(
  deps: { store: ProjectStore; storage: StorageAdapter },
  input: { orgId: string; projectId: string }
): Promise<{ tplPost: string; tplIndex: string }> {
  if (!process.env.OPENROUTER_API_KEY) throw new EditorError("Falta OPENROUTER_API_KEY en .env.local", 500);
  const project = await deps.store.getProject(input.orgId, input.projectId);
  if (!project) throw new EditorError("Proyecto no encontrado", 404);
  const current = await deps.store.getCurrentSnapshot(input.orgId, input.projectId);
  if (!current) throw new EditorError("El proyecto no tiene snapshot actual", 400);
  const entrada = await deps.storage.get(current.storagePrefix + project.entryPath);
  if (!entrada) throw new EditorError("El proyecto no tiene página de entrada", 400);
  const indexHtml = entrada.body.toString("utf-8");

  // Hojas de estilo LOCALES de la portada, en ruta absoluta desde la raíz (las de
  // CDN externo se ignoran). El contenido de la primera se adjunta como referencia
  // de clases, pero NO se incrusta.
  const hojas: string[] = [];
  let css = "";
  for (const m of indexHtml.matchAll(/<link[^>]+href=["']([^"']+\.css)["']/gi)) {
    if (/^https?:\/\//i.test(m[1])) continue;
    const abs = aRootAbsoluto(project.entryPath, m[1]);
    if (hojas.includes(abs)) continue;
    hojas.push(abs);
    if (!css) {
      const archivo = await deps.storage.get(current.storagePrefix + abs.slice(1));
      if (archivo) css = archivo.body.toString("utf-8");
    }
  }
  const enlaces = hojas.map((h) => `<link rel="stylesheet" href="${h}">`).join("\n");

  const prompt = `Eres un desarrollador frontend senior. Aquí tienes la portada de un sitio web y su CSS.
Genera DOS plantillas HTML completas para la sección de blog de este sitio, manteniendo su header, footer,
colores, tipografías y estética.

MUY IMPORTANTE sobre el CSS: NO lo incrustes. El blog se sirve dentro del MISMO sitio, así que ENLAZA sus
hojas de estilo. En el <head> de CADA plantilla incluye EXACTAMENTE estas etiquetas, con la ruta tal cual
(absoluta desde la raíz):
${enlaces || "(el sitio no tiene hojas de estilo locales; usa estilos mínimos propios)"}
Copia la estructura del header y el footer de la portada y reutiliza sus clases; el CSS de abajo es SOLO
referencia para saber qué clases existen, no lo pegues en la plantilla.

1. plantilla_post — página de un artículo. Debe usar EXACTAMENTE estos placeholders donde corresponda:
   {{titulo}} (título del artículo, en el <title> y en el hero/cabecera del artículo),
   {{meta_descripcion}} (en <meta name="description"> y en Open Graph og:description),
   {{contenido}} (el cuerpo del artículo, ya en HTML, dentro de un <article> con buena tipografía para lectura),
   {{imagen}} (URL de la imagen de portada, en un <img> y en og:image),
   {{fecha}} (fecha de publicación),
   {{canonical}} (en <link rel="canonical"> y og:url),
   {{json_ld}} (justo antes de </head>; es un <script> completo que se inyecta tal cual).
   Incluye también las meta Open Graph básicas (og:title, og:description, og:image, og:url) y lang="es".
   Incluye un enlace "← Volver al blog" hacia /blog/.

2. plantilla_index — página índice del blog (lista de artículos). El bloque que se repite por artículo debe ir
   delimitado EXACTAMENTE por los marcadores <!--POST--> y <!--/POST-->, y dentro puede usar los placeholders
   {{titulo}}, {{slug}}, {{meta_descripcion}}, {{fecha}} e {{imagen}}. El enlace de cada artículo es /blog/{{slug}}.html.
   Incluye un <title> y meta description fijos razonables para "Blog de ${project.nombre}".

No uses ningún otro placeholder {{...}} distinto de los listados.

=== index.html del sitio ===
${indexHtml.slice(0, 30000)}

=== CSS del sitio ===
${css.slice(0, 30000)}`;

  let r: { plantilla_post: string; plantilla_index: string };
  try {
    r = await pedirJson(prompt, PlantillasSchema, 16000);
  } catch {
    throw new EditorError("No se pudo generar la plantilla del blog, vuelve a intentarlo", 502);
  }
  if (validarPlantillas(r.plantilla_post, r.plantilla_index).length) {
    throw new EditorError("No se pudo generar la plantilla del blog, vuelve a intentarlo", 502);
  }
  return { tplPost: r.plantilla_post, tplIndex: r.plantilla_index };
}
