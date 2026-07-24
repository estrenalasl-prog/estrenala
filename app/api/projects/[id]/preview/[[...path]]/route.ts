import { resolvePreview } from "@/src/preview/resolve";
import { getStorage } from "@/src/storage/factory";
import { projectStore } from "@/src/repositories/projects";

export const runtime = "nodejs";

// Ruta PÚBLICA (la sirve el iframe del preview sin cookie): la capacidad es el
// UUID del proyecto, no la sesión. Por eso el org se resuelve desde el proyecto.
export async function GET(
  req: Request,
  ctx: { params: Promise<{ id: string; path?: string[] }> }
) {
  const { id, path } = await ctx.params;
  const project = await projectStore.getProjectById(id);
  if (!project) return new Response("Proyecto no encontrado", { status: 404 });
  const orgId = project.orgId;
  const snap = await projectStore.getCurrentSnapshot(orgId, id);
  if (!snap) return new Response("Sin snapshot", { status: 404 });

  const edit = new URL(req.url).searchParams.get("edit") === "1";
  const r = await resolvePreview(
    { storage: getStorage() },
    { projectId: id, storagePrefix: snap.storagePrefix, entryPath: project.entryPath, pathSegments: path ?? [], edit }
  );
  return new Response(new Uint8Array(r.body), { status: r.status, headers: { "content-type": r.contentType } });
}
