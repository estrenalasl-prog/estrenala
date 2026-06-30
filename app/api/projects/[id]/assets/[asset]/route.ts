import { getDevContext } from "@/src/auth/dev-stub";
import { getStorage } from "@/src/storage/factory";
import { projectStore } from "@/src/repositories/projects";
import { isUuid } from "@/src/editor/validate-op";

export const runtime = "nodejs";

export async function GET(req: Request, ctx: { params: Promise<{ id: string; asset: string }> }) {
  const { id, asset } = await ctx.params;
  const { orgId } = await getDevContext();

  const dot = asset.lastIndexOf(".");
  const assetId = dot === -1 ? asset : asset.slice(0, dot);
  if (!isUuid(assetId)) return new Response("No encontrado", { status: 404 });

  const row = await projectStore.getAsset(orgId, id, assetId);
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
