import { processZip, processFiles } from "./process-zip";
import { snapshotPrefix } from "@/src/storage/keys";
import { contentTypeFor } from "@/src/storage/content-type";
import type { ZipFile } from "./unzip";
import type { StorageAdapter } from "@/src/storage/types";
import type { ProjectStore } from "@/src/repositories/types";

type Deps = { store: ProjectStore; storage: StorageAdapter; orgId: string };

// Materializa un proyecto nuevo a partir de archivos YA procesados (saneados,
// filtrados y con su página de entrada elegida). Compartido por las dos vías de
// alta: ZIP y archivos/carpeta sueltos.
async function crearProyecto(
  deps: Deps,
  input: { files: ZipFile[]; entryPath: string; nombre?: string }
): Promise<{ projectId: string }> {
  const projectId = crypto.randomUUID();
  const snapshotId = crypto.randomUUID();
  const prefix = snapshotPrefix(projectId, snapshotId);

  for (const f of input.files) {
    await deps.storage.put(prefix + f.path, f.bytes, contentTypeFor(f.path));
  }

  const nombre = input.nombre?.trim() || `Proyecto ${new Date().toISOString().slice(0, 10)}`;
  await deps.store.createProjectWithSnapshot({
    projectId, snapshotId, orgId: deps.orgId, nombre, entryPath: input.entryPath, storagePrefix: prefix,
  });
  return { projectId };
}

export async function importProject(
  deps: Deps,
  input: { zip: Buffer; nombre?: string }
): Promise<{ projectId: string }> {
  const { files, entryPath } = processZip(input.zip);
  return crearProyecto(deps, { files, entryPath, nombre: input.nombre });
}

// Alta desde archivos sueltos o una carpeta entera (lo que arrastra el usuario
// cuando la IA no le dio un ZIP): mismas reglas de seguridad que el ZIP.
export async function importarArchivos(
  deps: Deps,
  input: { archivos: ZipFile[]; nombre?: string }
): Promise<{ projectId: string }> {
  const { files, entryPath } = processFiles(input.archivos);
  return crearProyecto(deps, { files, entryPath, nombre: input.nombre });
}
