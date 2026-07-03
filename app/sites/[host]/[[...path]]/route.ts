import { getStorage } from "@/src/storage/factory";
import { projectStore } from "@/src/repositories/projects";
import { resolvePublicSite } from "@/src/publish/resolve-site";

export const runtime = "nodejs";

export async function GET(_req: Request, ctx: { params: Promise<{ host: string; path?: string[] }> }) {
  const { host, path } = await ctx.params;
  const r = await resolvePublicSite(
    { store: projectStore, storage: getStorage() },
    {
      host: decodeURIComponent(host),
      platformHost: process.env.PLATFORM_HOST ?? "localhost:3000",
      pathSegments: path ?? [],
    }
  );
  return new Response(new Uint8Array(r.body), {
    status: r.status,
    headers: { "content-type": r.contentType, "cache-control": r.cacheControl },
  });
}
