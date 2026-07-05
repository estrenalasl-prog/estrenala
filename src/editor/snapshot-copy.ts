import { snapshotPrefix } from "@/src/storage/keys";
import type { StorageAdapter } from "@/src/storage/types";
import type { ProjectStore } from "@/src/repositories/types";

// Copia el snapshot actual a uno nuevo (tipo "edit"): las páginas .html pasan por
// `transformar` (null = sin cambios, se copian los bytes originales sin recodificar);
// `extras` añade archivos (p. ej. assets a wc-uploads/). Si el alta del snapshot en
// BD falla, se limpia el storage escrito (compensación). Mecánica compartida por
// saveEdits y por las herramientas del sitio.
export async function crearSnapshotEditado(
  deps: { store: ProjectStore; storage: StorageAdapter },
  input: {
    orgId: string;
    projectId: string;
    currentSnapshot: { id: string; storagePrefix: string };
    transformar: (rel: string, html: string) => string | null;
    extras?: Map<string, { body: Buffer; contentType: string }>;
    operacionesJson: unknown;
  }
): Promise<{ snapshotId: string }> {
  const snapshotId = crypto.randomUUID();
  const newPrefix = snapshotPrefix(input.projectId, snapshotId);
  const written: string[] = [];

  const keys = await deps.storage.list(input.currentSnapshot.storagePrefix);
  for (const key of keys) {
    const rel = key.slice(input.currentSnapshot.storagePrefix.length);
    const file = await deps.storage.get(key);
    if (!file) continue;
    let body = file.body;
    if (/\.html?$/i.test(rel)) {
      const nuevo = input.transformar(rel, body.toString("utf-8"));
      if (nuevo !== null) body = Buffer.from(nuevo, "utf-8");
    }
    await deps.storage.put(newPrefix + rel, body);
    written.push(newPrefix + rel);
  }
  for (const [path, asset] of input.extras ?? new Map<string, { body: Buffer; contentType: string }>()) {
    await deps.storage.put(newPrefix + path, asset.body, asset.contentType);
    written.push(newPrefix + path);
  }

  try {
    await deps.store.createSnapshot({
      snapshotId, projectId: input.projectId, parentId: input.currentSnapshot.id,
      tipo: "edit", storagePrefix: newPrefix, operacionesJson: input.operacionesJson,
    });
  } catch (e) {
    for (const k of written) { try { await deps.storage.delete(k); } catch { /* best-effort */ } }
    throw e;
  }
  await deps.store.setCurrentSnapshot(input.orgId, input.projectId, snapshotId);
  return { snapshotId };
}
