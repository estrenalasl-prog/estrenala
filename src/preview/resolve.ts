import { rewriteHtml } from "./rewrite";
import type { StorageAdapter } from "@/src/storage/types";

export async function resolvePreview(
  deps: { storage: StorageAdapter },
  input: { projectId: string; storagePrefix: string; entryPath: string; pathSegments: string[] }
): Promise<{ status: number; body: Buffer; contentType: string }> {
  const rel = input.pathSegments.length > 0 ? input.pathSegments.join("/") : input.entryPath;
  const file = await deps.storage.get(input.storagePrefix + rel);
  if (!file) {
    return { status: 404, body: Buffer.from("No encontrado"), contentType: "text/plain; charset=utf-8" };
  }
  if (/\.html?$/i.test(rel)) {
    const baseHref = `/api/projects/${input.projectId}/preview/`;
    const html = rewriteHtml(file.body.toString("utf-8"), baseHref);
    return { status: 200, body: Buffer.from(html, "utf-8"), contentType: "text/html; charset=utf-8" };
  }
  return { status: 200, body: file.body, contentType: file.contentType };
}
