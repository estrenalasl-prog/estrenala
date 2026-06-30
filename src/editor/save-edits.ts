import { snapshotPrefix } from "@/src/storage/keys";
import { applyTextEdits, type EditOp } from "./apply";
import { EditorError } from "./errors";
import type { StorageAdapter } from "@/src/storage/types";
import type { ProjectStore } from "@/src/repositories/types";

export async function saveEdits(
  deps: { store: ProjectStore; storage: StorageAdapter },
  input: { orgId: string; projectId: string; ops: EditOp[] }
): Promise<{ snapshotId: string }> {
  if (input.ops.length > 1000) throw new EditorError("Demasiadas ediciones (máx. 1000)", 400);
  if (input.ops.some((o) => typeof o.value === "string" && o.value.length > 50000)) {
    throw new EditorError("Texto demasiado largo (máx. 50000 caracteres)", 400);
  }
  const project = await deps.store.getProject(input.orgId, input.projectId);
  if (!project) throw new EditorError("Proyecto no encontrado", 404);
  const current = await deps.store.getCurrentSnapshot(input.orgId, input.projectId);
  if (!current) throw new EditorError("El proyecto no tiene snapshot actual", 400);

  const porPagina = new Map<string, { nodeId: number; value: string }[]>();
  for (const op of input.ops) {
    if (op.kind !== "text" || typeof op.value !== "string" || typeof op.nodeId !== "number" || !op.page) continue;
    const arr = porPagina.get(op.page) ?? [];
    arr.push({ nodeId: op.nodeId, value: op.value });
    porPagina.set(op.page, arr);
  }
  if (porPagina.size === 0) throw new EditorError("Ninguna edición válida", 400);

  const snapshotId = crypto.randomUUID();
  const newPrefix = snapshotPrefix(input.projectId, snapshotId);
  const keys = await deps.storage.list(current.storagePrefix);
  for (const key of keys) {
    const rel = key.slice(current.storagePrefix.length);
    const file = await deps.storage.get(key);
    if (!file) continue;
    let body = file.body;
    const ops = porPagina.get(rel);
    if (ops && /\.html?$/i.test(rel)) {
      body = Buffer.from(applyTextEdits(body.toString("utf-8"), ops), "utf-8");
    }
    await deps.storage.put(newPrefix + rel, body);
  }

  await deps.store.createSnapshot({
    snapshotId, projectId: input.projectId, parentId: current.id,
    tipo: "edit", storagePrefix: newPrefix, operacionesJson: input.ops,
  });
  await deps.store.setCurrentSnapshot(input.orgId, input.projectId, snapshotId);
  return { snapshotId };
}
