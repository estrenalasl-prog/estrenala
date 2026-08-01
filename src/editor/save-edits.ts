import { applyEdits, type EditOp, type PageOp } from "./apply";
import { isValidOp } from "./validate-op";
import { EditorError } from "./errors";
import { crearSnapshotEditado } from "./snapshot-copy";
import type { StorageAdapter } from "@/src/storage/types";
import type { ProjectStore } from "@/src/repositories/types";

function toPageOp(op: EditOp): PageOp {
  switch (op.kind) {
    case "text": return { nodeId: op.nodeId, kind: "text", value: op.value };
    case "richText": return { nodeId: op.nodeId, kind: "richText", value: op.value };
    case "href": return { nodeId: op.nodeId, kind: "href", value: op.value };
    case "src": return { nodeId: op.nodeId, kind: "src", value: op.value };
    case "style": return { nodeId: op.nodeId, kind: "style", property: op.property, value: op.value };
    case "textNode": return { nodeId: op.nodeId, kind: "textNode", index: op.index, value: op.value };
  }
}

/**
 * De dónde salen estas ediciones.
 *
 * El asistente de IA aplica sus cambios por el mismo camino que la edición a
 * mano, así que en el Historial las dos aparecían como «Edición» y no había
 * forma de distinguirlas. Y ahí es justo donde se decide a qué versión volver:
 * «lo que tocó la IA» y «lo que toqué yo» son la pregunta que uno se hace.
 *
 * Es solo una etiqueta: no da permisos ni cambia lo que se guarda, así que da
 * igual que venga del cliente.
 */
export type OrigenEdicion = "ia";

export async function saveEdits(
  deps: { store: ProjectStore; storage: StorageAdapter },
  input: { orgId: string; projectId: string; ops: EditOp[]; origen?: OrigenEdicion }
): Promise<{ snapshotId: string }> {
  if (input.ops.length > 1000) throw new EditorError("Demasiadas ediciones (máx. 1000)", 400);
  if (input.ops.some((o) => typeof o.value === "string" && o.value.length > 50000)) {
    throw new EditorError("Valor demasiado largo (máx. 50000 caracteres)", 400);
  }
  const project = await deps.store.getProject(input.orgId, input.projectId);
  if (!project) throw new EditorError("Proyecto no encontrado", 404);
  const current = await deps.store.getCurrentSnapshot(input.orgId, input.projectId);
  if (!current) throw new EditorError("El proyecto no tiene snapshot actual", 400);

  // Validar y separar por página. Las ops de imagen exigen un asset propio
  // Y que el fichero exista en storage; se acumulan ya con los bytes para
  // copiarlos al snapshot (clave = ruta destino en wc-uploads).
  const porPagina = new Map<string, PageOp[]>();
  const assetCopias = new Map<string, { body: Buffer; contentType: string }>(); // path destino (sin "/") -> { body, contentType }
  for (const op of input.ops) {
    if (typeof op?.nodeId !== "number" || !op.page) continue;
    if (!isValidOp(op)) continue;
    if (op.kind === "src") {
      const row = await deps.store.getAsset(input.orgId, input.projectId, op.assetId);
      if (!row) continue; // asset ajeno/inexistente → ignora la op
      const file = await deps.storage.get(row.storageKey);
      if (!file) continue; // fichero ausente (incoherencia storage/DB) → ignora la op (no rompe el guardado)
      assetCopias.set(op.value.replace(/^\//, ""), { body: file.body, contentType: row.contentType });
    }
    const arr = porPagina.get(op.page) ?? [];
    arr.push(toPageOp(op));
    porPagina.set(op.page, arr);
  }
  if (porPagina.size === 0) throw new EditorError("Ninguna edición válida", 400);

  return crearSnapshotEditado(deps, {
    orgId: input.orgId,
    projectId: input.projectId,
    currentSnapshot: { id: current.id, storagePrefix: current.storagePrefix },
    transformar: (rel, html) => {
      const ops = porPagina.get(rel);
      return ops ? applyEdits(html, ops) : null;
    },
    extras: assetCopias,
    tipo: input.origen === "ia" ? "edit-ia" : "edit",
    operacionesJson: input.ops,
  });
}
