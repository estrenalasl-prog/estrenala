import { resolvePreview } from "@/src/preview/resolve";
import { getDevContext } from "@/src/auth/dev-stub";
import { getStorage } from "@/src/storage/factory";
import { projectStore } from "@/src/repositories/projects";

export const runtime = "nodejs";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string; path?: string[] }> }
) {
  const { id, path } = await ctx.params;
  const { orgId } = await getDevContext();
  const project = await projectStore.getProject(orgId, id);
  if (!project) return new Response("Proyecto no encontrado", { status: 404 });
  const snap = await projectStore.getCurrentSnapshot(id);
  if (!snap) return new Response("Sin snapshot", { status: 404 });

  const r = await resolvePreview(
    { storage: getStorage() },
    { projectId: id, storagePrefix: snap.storagePrefix, entryPath: project.entryPath, pathSegments: path ?? [] }
  );
  return new Response(new Uint8Array(r.body), { status: r.status, headers: { "content-type": r.contentType } });
}
