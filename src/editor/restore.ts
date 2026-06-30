import { EditorError } from "./errors";
import type { ProjectStore } from "@/src/repositories/types";

export async function restoreSnapshot(
  deps: { store: ProjectStore },
  input: { orgId: string; projectId: string; snapshotId: string }
): Promise<void> {
  const snap = await deps.store.getSnapshotById(input.orgId, input.projectId, input.snapshotId);
  if (!snap) throw new EditorError("Snapshot no encontrado", 404);
  await deps.store.setCurrentSnapshot(input.orgId, input.projectId, input.snapshotId);
}
