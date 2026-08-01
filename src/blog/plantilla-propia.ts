import { EditorError } from "@/src/editor/errors";
import { claveOpenRouter } from "@/src/config/claves";
import { entrarOrg } from "@/src/auth/org-context";
import { pedirJson, PlantillasSchema, OpenRouterError } from "@/src/ia/claude";
import { validarPlantillas, MSG_SIN_CLAVE, MSG_SIN_SALDO } from "./site-template";
import type { StorageAdapter } from "@/src/storage/types";
import type { ProjectStore } from "@/src/repositories/types";

/**
 * «Traigo mi propia plantilla de blog».
 *
 * La vía normal es que la IA lea la portada y proponga el diseño del blog. Pero
 * hay quien ya tiene una plantilla hecha —por él o por otra herramienta— y no
 * quiere la nuestra. Hasta ahora eso era imposible sin pasar antes por caja: la
 * pantalla de plantillas solo aparecía DESPUÉS de generarlas con IA.
 *
 * Aquí el usuario trae su HTML y lo único que hacemos es colocarle los huecos
 * ({{titulo}}, {{contenido}}…) donde toquen, sin tocar su diseño. Es un trabajo
 * mucho más acotado que diseñar de cero, y por eso sale mejor.
 *
 * Quien sepa dónde van los huecos puede escribirlos a mano y no gastar ni un
 * céntimo de IA: esta función es el atajo, no el único camino.
 */

/** Tope de cada plantilla. Por encima, la respuesta del modelo se cortaría. */
export const LIMITE_PLANTILLA = 120_000;

export const MSG_VACIA = "Pega o sube el HTML de tu plantilla de artículo";
export const MSG_DEMASIADO_GRANDE = "La plantilla es demasiado grande (máx. 120.000 caracteres)";
export const MSG_NO_ES_HTML = "Eso no parece una página HTML";
export const MSG_NO_SE_PUDO = "No pudimos colocar los huecos en tu plantilla, vuelve a intentarlo";

/** Colapsa "." y ".." y devuelve la ruta relativa a la raíz del sitio, sin "/". */
function resolverRuta(ref: string, carpeta: string): string {
  const limpio = ref.split(/[?#]/)[0];
  const base = limpio.startsWith("/") ? limpio.slice(1) : carpeta + limpio;
  const partes: string[] = [];
  for (const seg of base.split("/")) {
    if (seg === "..") partes.pop();
    else if (seg && seg !== ".") partes.push(seg);
  }
  return partes.join("/");
}

/**
 * Hojas de estilo y scripts LOCALES que la plantilla enlaza y que no están en la web.
 *
 * Es el fallo más probable de una plantilla traída de fuera, y además silencioso:
 * se guarda sin queja, se publica, y el blog sale sin estilos. Dos motivos
 * típicos, los dos invisibles hasta que lo ves roto:
 *
 *  - La plantilla se diseñó suelta, con su `estilos.css` al lado. Pero los
 *    artículos se sirven en `/blog/`, así que esa ruta relativa pasa a buscar
 *    `/blog/estilos.css`, que no existe.
 *  - Enlaza un CSS que simplemente no forma parte de la web subida.
 *
 * Se avisa, no se bloquea: puede que lo suba justo después, y no somos nadie
 * para impedirle guardar su plantilla.
 */
export function recursosQueFaltan(
  html: string,
  input: { rutas: Set<string>; carpeta: string }
): string[] {
  const refs: string[] = [];
  for (const m of html.matchAll(/<link\b[^>]*>/gi)) {
    if (!/\brel\s*=\s*["'][^"']*\bstylesheet\b/i.test(m[0])) continue;
    const href = m[0].match(/\bhref\s*=\s*["']([^"']+)["']/i)?.[1];
    if (href) refs.push(href);
  }
  for (const m of html.matchAll(/<script\b[^>]*\bsrc\s*=\s*["']([^"']+)["']/gi)) {
    refs.push(m[1]);
  }

  const faltan: string[] = [];
  for (const ref of refs) {
    // Externas (CDN, //host, data:) no son cosa nuestra.
    if (/^(?:[a-z]+:)?\/\//i.test(ref) || /^data:/i.test(ref)) continue;
    const rel = resolverRuta(ref, input.carpeta);
    if (rel && !input.rutas.has(rel) && !faltan.includes(rel)) faltan.push(rel);
  }
  return faltan;
}

function revisar(html: string, obligatorio: boolean): string {
  const s = html.trim();
  if (!s) {
    if (obligatorio) throw new EditorError(MSG_VACIA, 400);
    return "";
  }
  if (s.length > LIMITE_PLANTILLA) throw new EditorError(MSG_DEMASIADO_GRANDE, 400);
  if (!/<\s*(html|body|div|section|article|main|header)\b/i.test(s)) {
    throw new EditorError(MSG_NO_ES_HTML, 400);
  }
  return s;
}

const REGLAS = `REGLAS ESTRICTAS — esto es lo más importante:
- NO rediseñes nada. Devuelve el MISMO HTML que te dan: mismas etiquetas, mismas clases,
  mismos atributos, mismo orden, misma indentación. No añadas ni quites secciones.
- NO toques el CSS: ni los <style>, ni los <link rel="stylesheet">, ni los class=. Tal cual.
- Tu ÚNICO trabajo es sustituir el contenido de EJEMPLO por el hueco que le corresponde.
  Si ves un titular de prueba, se cambia por {{titulo}}. Si ves párrafos de relleno del
  artículo, TODOS ellos se sustituyen por un único {{contenido}}.
- Si falta algún hueco obligatorio en el HTML (por ejemplo no hay <title>), añádelo en el
  <head> de la forma mínima, sin inventar diseño.
- No uses ningún otro hueco {{...}} distinto de los que se listan.`;

const HUECOS_POST_DOC = `{{titulo}} (en el <title> y en el titular del artículo),
   {{meta_descripcion}} (en <meta name="description"> y en og:description),
   {{contenido}} (el cuerpo del artículo, ya en HTML; sustituye TODO el texto de ejemplo del artículo),
   {{imagen}} (URL de la imagen de portada: en el <img> de cabecera si lo hay, y en og:image),
   {{fecha}} (fecha de publicación),
   {{canonical}} (en <link rel="canonical"> y en og:url),
   {{json_ld}} (justo antes de </head>; es un <script> completo que se inyecta tal cual)`;

export async function plantillasDesdeHtml(
  deps: { store: ProjectStore; storage: StorageAdapter },
  input: { orgId: string; projectId: string; htmlPost: string; htmlIndex?: string }
): Promise<{ tplPost: string; tplIndex: string; avisos: string[] }> {
  entrarOrg(input.orgId); // claves BYOK de esta organización (org-context)
  if (!(await claveOpenRouter())) throw new EditorError(MSG_SIN_CLAVE, 500);

  const htmlPost = revisar(input.htmlPost, true);
  const htmlIndex = revisar(input.htmlIndex ?? "", false);

  const project = await deps.store.getProject(input.orgId, input.projectId);
  if (!project) throw new EditorError("Proyecto no encontrado", 404);
  const current = await deps.store.getCurrentSnapshot(input.orgId, input.projectId);
  if (!current) throw new EditorError("El proyecto no tiene snapshot actual", 400);

  const bloqueIndex = htmlIndex
    ? `2. plantilla_index — parte de ESTE HTML que te da el usuario para el índice del blog, con las mismas
   reglas de arriba. El bloque que se repite por artículo debe quedar delimitado EXACTAMENTE por los
   marcadores <!--POST--> y <!--/POST-->, y dentro puede usar {{titulo}}, {{slug}}, {{meta_descripcion}},
   {{fecha}} e {{imagen}}. El enlace de cada artículo es /blog/{{slug}}.html.

=== HTML del índice (del usuario) ===
${htmlIndex}`
    : `2. plantilla_index — el usuario NO ha traído índice, así que constrúyelo REUTILIZANDO su plantilla de
   artículo: el mismo <head>, el mismo header y el mismo footer, y en medio la lista de artículos usando
   las clases que ya existan en su HTML. No inventes un diseño nuevo ni escribas CSS. El bloque que se
   repite por artículo debe quedar delimitado EXACTAMENTE por los marcadores <!--POST--> y <!--/POST-->,
   y dentro puede usar {{titulo}}, {{slug}}, {{meta_descripcion}}, {{fecha}} e {{imagen}}. El enlace de
   cada artículo es /blog/{{slug}}.html. Pon un <title> y una meta description fijos razonables para
   "Blog de ${project.nombre}".`;

  const prompt = `El usuario ya tiene SU PROPIA plantilla de blog, diseñada por él. NO hay que diseñar nada:
hay que colocarle los huecos para que nuestro sistema pueda rellenarla con cada artículo.

${REGLAS}

1. plantilla_post — el HTML de artículo que te da el usuario, con estos huecos colocados donde toque:
   ${HUECOS_POST_DOC}.
   Añade también, si no están, las meta Open Graph básicas (og:title, og:description, og:image, og:url).

${bloqueIndex}

=== HTML del artículo (del usuario) ===
${htmlPost}`;

  let r: { plantilla_post: string; plantilla_index: string };
  try {
    r = await pedirJson(prompt, PlantillasSchema, 32000);
  } catch (e) {
    if (e instanceof OpenRouterError && e.status === 402) throw new EditorError(MSG_SIN_SALDO, 402);
    throw new EditorError(MSG_NO_SE_PUDO, 502);
  }

  const errores = validarPlantillas(r.plantilla_post, r.plantilla_index);
  if (errores.length) {
    // El motivo importa: sin esto, un fallo repetido con la misma plantilla no
    // hay forma de diagnosticarlo. No se registra el HTML del usuario.
    console.error("[blog] la plantilla del usuario no valida:", JSON.stringify(errores));
    throw new EditorError(MSG_NO_SE_PUDO, 502);
  }

  // Los artículos se sirven en /blog/, así que las rutas relativas de su
  // plantilla se resuelven desde ahí y no desde la raíz.
  const claves = await deps.storage.list(current.storagePrefix);
  const rutas = new Set(claves.map((k) => k.slice(current.storagePrefix.length)));
  const faltan = [
    ...new Set([
      ...recursosQueFaltan(r.plantilla_post, { rutas, carpeta: "blog/" }),
      ...recursosQueFaltan(r.plantilla_index, { rutas, carpeta: "blog/" }),
    ]),
  ];
  const avisos = faltan.length
    ? [`Tu plantilla enlaza archivos que no están en tu web: ${faltan.join(", ")}. Súbelos o el blog se verá sin estilos.`]
    : [];

  return { tplPost: r.plantilla_post, tplIndex: r.plantilla_index, avisos };
}
