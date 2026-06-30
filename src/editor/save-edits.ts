import { snapshotPrefix } from "@/src/storage/keys";
import { applyEdits, type EditOp, type PageOp } from "./apply";
import { isValidOp } from "./validate-op";
import { EditorError } from "./errors";
import type { StorageAdapter } from "@/src/storage/types";
import type { AssetRow, ProjectStore } from "@/src/repositories/types";

function toPageOp(op: EditOp): PageOp {
  switch (op.kind) {
    case "text": return { nodeId: op.nodeId, kind: "text", value: op.value };
    case "href": return { nodeId: op.nodeId, kind: "href", value: op.value };
    case "src": return { nodeId: op.nodeId, kind: "src", value: op.value };
    case "style": return { nodeId: op.nodeId, kind: "style", property: op.property, value: op.value };
  }
}

export async function saveEdits(
  deps: { store: ProjectStore; storage: StorageAdapter },
  input: { orgId: string; projectId: string; ops: EditOp[] }
): Promise<{ snapshotId: string }> {
  if (input.ops.length > 1000) throw new EditorError("Demasiadas ediciones (máx. 1000)", 400);
  if (input.ops.some((o) => typeof o.value === "string" && o.value.length > 50000)) {
    throw new EditorError("Valor demasiado largo (máx. 50000 caracteres)", 400);
  }
  const project = await deps.store.getProject(input.orgId, input.projectId);
  if (!project) throw new EditorError("Proyecto no encontrado", 404);
  const current = await deps.store.getCurrentSnapshot(input.orgId, input.projectId);
  if (!current) throw new EditorError("El proyecto no tiene snapshot actual", 400);

  // Validar y separar por página. Las ops de imagen exigen un asset propio;
  // se acumulan para copiarlas al snapshot (clave = ruta destino en wc-uploads).
  const porPagina = new Map<string, PageOp[]>();
  const assetCopias = new Map<string, AssetRow>(); // path destino (sin "/") -> asset
  for (const op of input.ops) {
    if (typeof op?.nodeId !== "number" || !op.page) continue;
    if (!isValidOp(op)) continue;
    if (op.kind === "src") {
      const row = await deps.store.getAsset(input.orgId, input.projectId, op.assetId);
      if (!row) continue; // asset ajeno/inexistente → ignora esta op
      assetCopias.set(op.value.replace(/^\//, ""), row);
    }
    const arr = porPagina.get(op.page) ?? [];
    arr.push(toPageOp(op));
    porPagina.set(op.page, arr);
  }
  if (porPagina.size === 0) throw new EditorError("Ninguna edición válida", 400);

  const snapshotId = crypto.randomUUID();
  const newPrefix = snapshotPrefix(input.projectId, snapshotId);
  const written: string[] = [];

  // 1) Copiar el árbol, aplicando los edits a las páginas html.
  const keys = await deps.storage.list(current.storagePrefix);
  for (const key of keys) {
    const rel = key.slice(current.storagePrefix.length);
    const file = await deps.storage.get(key);
    if (!file) continue;
    let body = file.body;
    const ops = porPagina.get(rel);
    if (ops && /\.html?$/i.test(rel)) {
      body = Buffer.from(applyEdits(body.toString("utf-8"), ops), "utf-8");
    }
    await deps.storage.put(newPrefix + rel, body);
    written.push(newPrefix + rel);
  }

  // 2) Copiar los assets usados a wc-uploads/ → la web queda auto-contenida.
  for (const [path, row] of assetCopias) {
    const src = await deps.storage.get(row.storageKey);
    if (!src) continue;
    await deps.storage.put(newPrefix + path, src.body, row.contentType);
    written.push(newPrefix + path);
  }

  // 3) Crear el snapshot con limpieza compensatoria del storage si falla.
  try {
    await deps.store.createSnapshot({
      snapshotId, projectId: input.projectId, parentId: current.id,
      tipo: "edit", storagePrefix: newPrefix, operacionesJson: input.ops,
    });
  } catch (e) {
    for (const k of written) { try { await deps.storage.delete(k); } catch { /* best-effort */ } }
    throw e;
  }
  await deps.store.setCurrentSnapshot(input.orgId, input.projectId, snapshotId);
  return { snapshotId };
}
