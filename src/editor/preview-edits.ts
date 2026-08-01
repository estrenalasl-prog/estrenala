import { applyEdits, type EditOp } from "./apply";
import { isValidOp } from "./validate-op";
import { EditorError } from "./errors";
import { toPageOp } from "./save-edits";
import { rewriteHtml } from "@/src/preview/rewrite";
import type { StorageAdapter } from "@/src/storage/types";
import type { ProjectStore } from "@/src/repositories/types";

/**
 * Cómo quedaría la página con unos cambios propuestos, SIN guardarlos.
 *
 * Nace para el asistente de IA: hasta ahora enseñaba una lista de «esto por
 * esto» y había que fiarse. Sebas, después de usarlo: «no entiendo mucho qué
 * pasó ahí, para un usuario normal qué se supone que pasó aquí». Leer una lista
 * de cambios no es lo mismo que ver tu web.
 *
 * Se aplica con `applyEdits` y `isValidOp`, los MISMOS que usa `saveEdits`: si
 * la vista previa se calculara por otro camino podría enseñar una cosa y
 * guardarse otra, que es peor que no tener vista previa.
 *
 * El HTML sale reescrito hacia la ruta de preview (igual que la vista previa
 * normal del panel) para que se vea con sus estilos e imágenes. No se escribe
 * nada en el almacenamiento ni se crea ninguna versión.
 */
export async function previsualizarEdicion(
  deps: { store: ProjectStore; storage: StorageAdapter },
  input: { orgId: string; projectId: string; page: string; ops: EditOp[] }
): Promise<{ html: string }> {
  if (input.ops.length > 1000) throw new EditorError("Demasiadas ediciones (máx. 1000)", 400);
  const project = await deps.store.getProject(input.orgId, input.projectId);
  if (!project) throw new EditorError("Proyecto no encontrado", 404);
  const current = await deps.store.getCurrentSnapshot(input.orgId, input.projectId);
  if (!current) throw new EditorError("El proyecto no tiene snapshot actual", 400);

  // La página llega del cliente: se sirve desde el prefijo del snapshot, así que
  // un "../" la sacaría del proyecto.
  if (input.page.includes("..") || input.page.startsWith("/")) {
    throw new EditorError("Ruta no válida", 400);
  }
  const file = await deps.storage.get(current.storagePrefix + input.page);
  if (!file) throw new EditorError("Página no encontrada", 404);

  const ops = input.ops
    .filter((op) => typeof op?.nodeId === "number" && op.page === input.page && isValidOp(op))
    .map(toPageOp);

  const html = applyEdits(file.body.toString("utf-8"), ops);
  return { html: rewriteHtml(html, `/api/projects/${input.projectId}/preview/`) };
}
