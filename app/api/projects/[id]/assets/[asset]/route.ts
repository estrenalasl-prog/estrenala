import { getStorage } from "@/src/storage/factory";
import { projectStore } from "@/src/repositories/projects";
import { isUuid } from "@/src/editor/validate-op";

export const runtime = "nodejs";

// Ruta PÚBLICA (la sirve el iframe del preview sin cookie): la capacidad es el
// UUID del proyecto, no la sesión. Por eso el org se resuelve desde el proyecto.
export async function GET(_req: Request, ctx: { params: Promise<{ id: string; asset: string }> }) {
  const { id, asset } = await ctx.params;

  const dot = asset.lastIndexOf(".");
  const assetId = dot === -1 ? asset : asset.slice(0, dot);
  if (!isUuid(assetId)) return new Response("No encontrado", { status: 404 });

  const project = await projectStore.getProjectById(id);
  if (!project) return new Response("No encontrado", { status: 404 });

  const row = await projectStore.getAsset(project.orgId, id, assetId);
  if (!row) return new Response("No encontrado", { status: 404 });

  const file = await getStorage().get(row.storageKey);
  if (!file) return new Response("No encontrado", { status: 404 });

  return new Response(new Uint8Array(file.body), {
    status: 200,
    headers: {
      "content-type": row.contentType,
      // El asset puede ser SVG: si se navega directo, neutraliza scripts.
      "content-security-policy": "sandbox",
      "x-content-type-options": "nosniff",
      "cache-control": "private, max-age=300",
    },
  });
}
