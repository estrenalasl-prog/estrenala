import { processZip } from "./process-zip";
import { snapshotPrefix } from "@/src/storage/keys";
import { contentTypeFor } from "@/src/storage/content-type";
import type { StorageAdapter } from "@/src/storage/types";
import type { ProjectStore } from "@/src/repositories/types";

export async function importProject(
  deps: { store: ProjectStore; storage: StorageAdapter; orgId: string },
  input: { zip: Buffer; nombre?: string }
): Promise<{ projectId: string }> {
  const { files, entryPath } = processZip(input.zip);

  const projectId = crypto.randomUUID();
  const snapshotId = crypto.randomUUID();
  const prefix = snapshotPrefix(projectId, snapshotId);

  for (const f of files) {
    await deps.storage.put(prefix + f.path, f.bytes, contentTypeFor(f.path));
  }

  const nombre = input.nombre?.trim() || `Proyecto ${new Date().toISOString().slice(0, 10)}`;
  await deps.store.createProjectWithSnapshot({
    projectId, snapshotId, orgId: deps.orgId, nombre, entryPath, storagePrefix: prefix,
  });
  return { projectId };
}
