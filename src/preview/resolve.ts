import { rewriteHtml } from "./rewrite";
import { annotateForEdit } from "@/src/editor/annotate";
import type { StorageAdapter } from "@/src/storage/types";

function injectEditorScript(html: string, projectId: string, page: string): string {
  const tag = `<script src="/wc-editor.js" data-project="${projectId}" data-page="${page}"></script>`;
  const i = html.lastIndexOf("</body>");
  return i === -1 ? html + tag : html.slice(0, i) + tag + html.slice(i);
}

export async function resolvePreview(
  deps: { storage: StorageAdapter },
  input: { projectId: string; storagePrefix: string; entryPath: string; pathSegments: string[]; edit?: boolean }
): Promise<{ status: number; body: Buffer; contentType: string }> {
  if (input.pathSegments.some((s) => s === ".." || s.includes("/") || s.includes("\\"))) {
    return { status: 400, body: Buffer.from("Ruta no válida"), contentType: "text/plain; charset=utf-8" };
  }
  const rel = input.pathSegments.length > 0 ? input.pathSegments.join("/") : input.entryPath;
  const file = await deps.storage.get(input.storagePrefix + rel);
  if (!file) {
    return { status: 404, body: Buffer.from("No encontrado"), contentType: "text/plain; charset=utf-8" };
  }
  if (/\.html?$/i.test(rel)) {
    const baseHref = `/api/projects/${input.projectId}/preview/`;
    let html = file.body.toString("utf-8");
    if (input.edit) html = annotateForEdit(html);
    html = rewriteHtml(html, baseHref);
    if (input.edit) html = injectEditorScript(html, input.projectId, rel);
    return { status: 200, body: Buffer.from(html, "utf-8"), contentType: "text/html; charset=utf-8" };
  }
  return { status: 200, body: file.body, contentType: file.contentType };
}
