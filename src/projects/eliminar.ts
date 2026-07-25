import { EditorError } from "@/src/editor/errors";
import type { StorageAdapter } from "@/src/storage/types";

// Interfaz estructural mínima (para poder testear sin arrastrar la BD). El store
// concreto (DrizzleProjectStore) la cumple con getProject + deleteProjectCascade.
export interface BorradoProyectoStore {
  getProject(orgId: string, projectId: string): Promise<{ id: string } | null>;
  deleteProjectCascade(orgId: string, projectId: string): Promise<void>;
}

// Borra un proyecto por completo: sus filas (en cascada, transacción del store) y
// su storage (snapshots + assets bajo projects/{id}/). Orden deliberado: BD PRIMERO;
// si luego falla el storage solo quedan archivos huérfanos inertes, nunca filas que
// apunten a archivos ausentes. La limpieza del storage es best-effort.
export async function eliminarProyecto(
  deps: { store: BorradoProyectoStore; storage: StorageAdapter },
  input: { orgId: string; projectId: string }
): Promise<void> {
  const project = await deps.store.getProject(input.orgId, input.projectId);
  if (!project) throw new EditorError("Proyecto no encontrado", 404);

  await deps.store.deleteProjectCascade(input.orgId, input.projectId);

  const prefijo = `projects/${input.projectId}/`;
  try {
    const claves = await deps.storage.list(prefijo);
    for (const k of claves) {
      try { await deps.storage.delete(k); } catch { /* huérfano inerte */ }
    }
  } catch { /* el proyecto ya no existe en BD; los archivos sueltos no rompen nada */ }
}
