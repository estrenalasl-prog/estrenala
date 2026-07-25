import { processZip } from "@/src/import/process-zip";
import { snapshotPrefix } from "@/src/storage/keys";
import { contentTypeFor } from "@/src/storage/content-type";
import { EditorError } from "@/src/editor/errors";
import type { StorageAdapter } from "@/src/storage/types";
import type { ProjectStore } from "@/src/repositories/types";

// Actualiza una web existente con un ZIP nuevo (p. ej. tras editarla en tu propia
// herramienta): crea un snapshot NUEVO con el contenido del ZIP, lo deja como actual
// y ajusta la página de entrada si cambió. Mantiene el proyecto, su dirección y todo
// el Historial (reversible). NO mezcla con lo editado dentro de Estrénala: el ZIP es
// la versión completa nueva. Si algo falla tras escribir en storage, se limpia.
export async function actualizarProyecto(
  deps: { store: ProjectStore; storage: StorageAdapter },
  input: { orgId: string; projectId: string; zip: Buffer }
): Promise<{ snapshotId: string }> {
  const project = await deps.store.getProject(input.orgId, input.projectId);
  if (!project) throw new EditorError("Proyecto no encontrado", 404);
  const current = await deps.store.getCurrentSnapshot(input.orgId, input.projectId);
  if (!current) throw new EditorError("El proyecto no tiene snapshot actual", 400);

  const { files, entryPath } = processZip(input.zip); // ImportError si el ZIP no vale

  const snapshotId = crypto.randomUUID();
  const prefix = snapshotPrefix(input.projectId, snapshotId);
  const written: string[] = [];
  try {
    for (const f of files) {
      await deps.storage.put(prefix + f.path, f.bytes, contentTypeFor(f.path));
      written.push(prefix + f.path);
    }
    await deps.store.createSnapshot({
      snapshotId,
      projectId: input.projectId,
      parentId: current.id,
      tipo: "actualizacion",
      storagePrefix: prefix,
      operacionesJson: { actualizacion: { archivos: files.length } },
    });
  } catch (e) {
    for (const k of written) { try { await deps.storage.delete(k); } catch { /* best-effort */ } }
    throw e;
  }

  await deps.store.setCurrentSnapshot(input.orgId, input.projectId, snapshotId);
  if (project.entryPath !== entryPath) {
    await deps.store.setEntryPath(input.orgId, input.projectId, entryPath);
  }
  return { snapshotId };
}
