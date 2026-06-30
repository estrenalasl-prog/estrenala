import { assetKey } from "@/src/storage/keys";
import { ALLOWED_IMAGE_EXTS } from "./validate-op";
import { EditorError } from "./errors";
import type { StorageAdapter } from "@/src/storage/types";
import type { ProjectStore } from "@/src/repositories/types";

const MAX_BYTES = 10 * 1024 * 1024;

const EXT_CONTENT_TYPE: Record<string, string> = {
  png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", gif: "image/gif",
  webp: "image/webp", avif: "image/avif", svg: "image/svg+xml",
};

export async function uploadAsset(
  deps: { store: ProjectStore; storage: StorageAdapter },
  input: { orgId: string; projectId: string; filename: string; bytes: Buffer }
): Promise<{ assetId: string; ext: string; url: string }> {
  const ext = (input.filename.split(".").pop() ?? "").toLowerCase();
  if (!(ALLOWED_IMAGE_EXTS as readonly string[]).includes(ext)) {
    throw new EditorError("Tipo de imagen no permitido", 400);
  }
  if (input.bytes.length === 0) throw new EditorError("Archivo vacío", 400);
  if (input.bytes.length > MAX_BYTES) throw new EditorError("Imagen demasiado grande (máx. 10 MB)", 400);

  const project = await deps.store.getProject(input.orgId, input.projectId);
  if (!project) throw new EditorError("Proyecto no encontrado", 404);

  const assetId = crypto.randomUUID();
  const storageKey = assetKey(input.projectId, assetId, ext);
  const contentType = EXT_CONTENT_TYPE[ext];
  await deps.storage.put(storageKey, input.bytes, contentType);
  await deps.store.createAsset({
    assetId, projectId: input.projectId, storageKey, contentType, bytes: input.bytes.length,
  });
  return { assetId, ext, url: `/api/projects/${input.projectId}/assets/${assetId}.${ext}` };
}
