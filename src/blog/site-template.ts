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

// Lee la portada (y su primer CSS local) del snapshot actual y pide a Claude las
// dos plantillas. No persiste nada: el usuario revisa y guarda con PUT.
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

  let css = "";
  const linkCss = indexHtml.match(/<link[^>]+href=["']([^"']+\.css)["']/i);
  if (linkCss && !/^https?:\/\//.test(linkCss[1])) {
    const dir = project.entryPath.includes("/") ? project.entryPath.slice(0, project.entryPath.lastIndexOf("/") + 1) : "";
    const partes: string[] = [];
    for (const seg of (dir + linkCss[1].replace(/^\//, "")).split("/")) {
      if (seg === "..") partes.pop(); else if (seg && seg !== ".") partes.push(seg);
    }
    const archivo = await deps.storage.get(current.storagePrefix + partes.join("/"));
    if (archivo) css = archivo.body.toString("utf-8");
  }

  const prompt = `Eres un desarrollador frontend senior. Aquí tienes la portada de un sitio web y su CSS.
Genera DOS plantillas HTML completas para la sección de blog de este sitio, manteniendo su header, footer,
colores, tipografías y estética. Las plantillas deben ser AUTOCONTENIDAS: incluye el CSS necesario inline
en una etiqueta <style> dentro del <head> (no dependas de archivos externos del sitio).

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
