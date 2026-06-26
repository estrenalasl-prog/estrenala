import { listHtmlPages } from "@/src/storage/local-fs";
import type { StorageAdapter } from "@/src/storage/types";
import type { ProjectStore } from "@/src/repositories/types";

async function paginas(
  deps: { store: ProjectStore; storage: StorageAdapter },
  input: { orgId: string; projectId: string }
): Promise<string[]> {
  const snap = await deps.store.getCurrentSnapshot(input.orgId, input.projectId);
  if (!snap) return [];
  return listHtmlPages(deps.storage, snap.storagePrefix);
}

export async function listPages(
  deps: { store: ProjectStore; storage: StorageAdapter },
  input: { orgId: string; projectId: string }
): Promise<string[]> {
  return paginas(deps, input);
}

export async function setEntryPath(
  deps: { store: ProjectStore; storage: StorageAdapter },
  input: { orgId: string; projectId: string; entryPath: string }
): Promise<void> {
  const pages = await paginas(deps, input);
  if (!pages.includes(input.entryPath)) {
    throw new Error(`La página "${input.entryPath}" no existe en el proyecto`);
  }
  await deps.store.setEntryPath(input.orgId, input.projectId, input.entryPath);
}
