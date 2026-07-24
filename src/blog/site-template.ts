import { EditorError } from "@/src/editor/errors";
import { claveOpenRouter } from "@/src/config/claves";
import { entrarOrg } from "@/src/auth/org-context";
import { pedirJson, PlantillasSchema, OpenRouterError } from "@/src/ia/claude";
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
  entrarOrg(input.orgId); // claves BYOK de esta organización (org-context)
  if (!(await claveOpenRouter())) throw new EditorError("Falta la clave de OpenRouter: añádela en Configuración", 500);
  const project = await deps.store.getProject(input.orgId, input.projectId);
  if (!project) throw new EditorError("Proyecto no encontrado", 404);
  const current = await deps.store.getCurrentSnapshot(input.orgId, input.projectId);
  if (!current) throw new EditorError("El proyecto no tiene snapshot actual", 400);
  const entrada = await deps.storage.get(current.storagePrefix + project.entryPath);
  if (!entrada) throw new EditorError("El proyecto no tiene página de entrada", 400);
  const indexHtml = entrada.body.toString("utf-8");

  // Hojas de estilo LOCALES de la portada, en ruta absoluta desde la raíz (las de
  // CDN externo se ignoran). La plantilla las ENLAZA; NO se envía ni se incrusta el
  // CSS: el modelo saca las clases del propio HTML de la portada. Enviar el CSS (o
  // dejar que lo incruste) disparaba la salida a >12k tokens y ~$0.25 por generación;
  // así baja a ~4-5k tokens y ~$0.10, sin <style> en el resultado.
  const hojas: string[] = [];
  for (const m of indexHtml.matchAll(/<link[^>]+href=["']([^"']+\.css)["']/gi)) {
    if (/^https?:\/\//i.test(m[1])) continue;
    const abs = aRootAbsoluto(project.entryPath, m[1]);
    if (!hojas.includes(abs)) hojas.push(abs);
  }
  const enlaces = hojas.map((h) => `<link rel="stylesheet" href="${h}">`).join("\n")
    || "(el sitio no tiene hojas de estilo locales; usa estilos mínimos propios en la plantilla)";

  const prompt = `Eres un desarrollador frontend senior. Aquí tienes la portada (HTML) de un sitio web.
Genera DOS plantillas HTML para su sección de blog, con el MISMO header y footer que la portada.

REGLAS ESTRICTAS SOBRE EL CSS:
- NO escribas ninguna etiqueta <style> ni CSS: ni una sola línea. La plantilla es SOLO estructura HTML.
- En el <head> de CADA plantilla enlaza las hojas de estilo del sitio, con la ruta tal cual (absoluta desde la raíz):
${enlaces}
- Copia el header y el footer directamente del HTML de abajo (mismas etiquetas y mismos class=), sin reescribir estilos.
- Para el cuerpo usa HTML semántico simple reutilizando las clases que veas en ese HTML.

1. plantilla_post — página de un artículo. Debe usar EXACTAMENTE estos placeholders donde corresponda:
   {{titulo}} (en el <title> y en la cabecera del artículo),
   {{meta_descripcion}} (en <meta name="description"> y en Open Graph og:description),
   {{contenido}} (el cuerpo del artículo, ya en HTML, dentro de un <article>),
   {{imagen}} (URL de la imagen de portada, en un <img> y en og:image),
   {{fecha}} (fecha de publicación),
   {{canonical}} (en <link rel="canonical"> y og:url),
   {{json_ld}} (justo antes de </head>; es un <script> completo que se inyecta tal cual).
   Incluye también las meta Open Graph básicas (og:title, og:description, og:image, og:url), lang="es"
   y un enlace "← Volver al blog" hacia /blog/.

2. plantilla_index — página índice del blog (lista de artículos). El bloque que se repite por artículo debe ir
   delimitado EXACTAMENTE por los marcadores <!--POST--> y <!--/POST-->, y dentro puede usar los placeholders
   {{titulo}}, {{slug}}, {{meta_descripcion}}, {{fecha}} e {{imagen}}. El enlace de cada artículo es /blog/{{slug}}.html.
   Incluye un <title> y meta description fijos razonables para "Blog de ${project.nombre}".

No uses ningún otro placeholder {{...}} distinto de los listados.

=== index.html del sitio ===
${indexHtml.slice(0, 30000)}`;

  let r: { plantilla_post: string; plantilla_index: string };
  try {
    r = await pedirJson(prompt, PlantillasSchema, 16000);
  } catch (e) {
    // Sin saldo en OpenRouter (402): mensaje accionable en vez del genérico, para
    // no confundir un problema de crédito con un fallo del sistema.
    if (e instanceof OpenRouterError && e.status === 402) {
      throw new EditorError("Tu cuenta de OpenRouter no tiene saldo. Añade crédito en openrouter.ai/settings/credits e inténtalo de nuevo.", 402);
    }
    throw new EditorError("No se pudo generar la plantilla del blog, vuelve a intentarlo", 502);
  }
  if (validarPlantillas(r.plantilla_post, r.plantilla_index).length) {
    throw new EditorError("No se pudo generar la plantilla del blog, vuelve a intentarlo", 502);
  }
  return { tplPost: r.plantilla_post, tplIndex: r.plantilla_index };
}
