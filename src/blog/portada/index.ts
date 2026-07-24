import { EditorError } from "@/src/editor/errors";
import { uploadAsset } from "@/src/editor/assets";
import { pedirImagen, OpenRouterError } from "@/src/ia/claude";
import { claveOpenRouter } from "@/src/config/claves";
import { extraerColores, paletaPara } from "./colores";
import { generarSvgPortada } from "./svg";
import { rasterizarPortadaPng } from "./png";
import { entrarOrg } from "@/src/auth/org-context";
import type { StorageAdapter } from "@/src/storage/types";
import type { ProjectStore } from "@/src/repositories/types";
import type { BlogStore } from "@/src/repositories/blog";

export type DepsPortada = { store: ProjectStore; blog: BlogStore; storage: StorageAdapter };

const MAX_CSS = 5; // hojas de estilo que se leen buscando colores
const EXT_POR_TIPO: Record<string, string> = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp" };

// Portada automática: `diseno` compone un SVG con los colores del propio sitio
// (gratis, determinista) y lo rasteriza a PNG — WhatsApp/X no muestran SVG en
// og:image (4f2); `ia` pide una imagen al modelo de imagen FIJO de la
// plataforma (céntimos, nunca el modelo de texto del usuario). En ambos casos
// el resultado entra por uploadAsset: un asset normal, como si se subiera a mano.
export async function generarPortada(
  deps: DepsPortada,
  input: { orgId: string; projectId: string; titulo: string; modo: string }
): Promise<{ assetId: string; url: string }> {
  entrarOrg(input.orgId); // claves BYOK de esta organización (org-context)
  const project = await deps.store.getProject(input.orgId, input.projectId);
  if (!project) throw new EditorError("Proyecto no encontrado", 404);
  if (!input.titulo.trim()) throw new EditorError("Escribe primero el título del artículo", 400);
  if (input.modo !== "diseno" && input.modo !== "ia") throw new EditorError("Modo desconocido", 400);

  if (input.modo === "diseno") {
    const textos: string[] = [];
    const current = await deps.store.getCurrentSnapshot(input.orgId, input.projectId);
    if (current) {
      const claves = (await deps.storage.list(current.storagePrefix))
        .filter((k) => k.toLowerCase().endsWith(".css")).slice(0, MAX_CSS);
      for (const k of claves) {
        const f = await deps.storage.get(k);
        if (f) textos.push(f.body.toString("utf-8"));
      }
      const entrada = await deps.storage.get(current.storagePrefix + project.entryPath);
      if (entrada) textos.push(entrada.body.toString("utf-8"));
    }
    const colores = extraerColores(textos);
    const pareja: [string, string] =
      colores.length >= 2 ? [colores[0], colores[1]]
      : colores.length === 1 ? [colores[0], paletaPara(project.nombre)[1]]
      : paletaPara(project.nombre);
    const svg = generarSvgPortada({ titulo: input.titulo, sitio: project.nombre, colores: pareja });
    let png: Buffer;
    try {
      png = await rasterizarPortadaPng(svg);
    } catch {
      throw new EditorError("No se pudo generar la portada, vuelve a intentarlo", 500);
    }
    const r = await uploadAsset({ store: deps.store, storage: deps.storage }, {
      orgId: input.orgId, projectId: input.projectId,
      filename: "portada-diseno.png", bytes: png,
    });
    return { assetId: r.assetId, url: r.url };
  }

  // modo "ia"
  if (!(await claveOpenRouter())) throw new EditorError("Falta la clave de OpenRouter: añádela en Configuración", 500);
  const settings = await deps.blog.getBlogSettings(input.orgId, input.projectId);
  const nicho = settings?.nicho.trim() ?? "";
  const prompt =
    `Genera una imagen de portada para un artículo de blog titulado «${input.titulo}».` +
    (nicho ? ` El blog trata de: ${nicho}.` : "") +
    " Estilo: fotografía editorial o ilustración moderna y limpia, apaisada (16:9), colores sobrios y profesionales." +
    " MUY IMPORTANTE: sin ningún texto, letras, palabras, logotipos ni marcas de agua en la imagen.";
  let imagen: { bytes: Buffer; contentType: string };
  try {
    imagen = await pedirImagen(prompt);
  } catch (e) {
    if (e instanceof OpenRouterError && e.status === 402) {
      throw new EditorError("Tu cuenta de OpenRouter no tiene saldo. Añade crédito en openrouter.ai/settings/credits e inténtalo de nuevo.", 402);
    }
    throw new EditorError("No se pudo generar la portada, vuelve a intentarlo", 502);
  }
  const ext = EXT_POR_TIPO[imagen.contentType] ?? "png";
  const r = await uploadAsset({ store: deps.store, storage: deps.storage }, {
    orgId: input.orgId, projectId: input.projectId,
    filename: `portada-ia.${ext}`, bytes: imagen.bytes,
  });
  return { assetId: r.assetId, url: r.url };
}
