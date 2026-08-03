import { getStorage } from "@/src/storage/factory";
import { projectStore } from "@/src/repositories/projects";
import { resolvePublicSite } from "@/src/publish/resolve-site";

export const runtime = "nodejs";

export async function GET(req: Request, ctx: { params: Promise<{ host: string; path?: string[] }> }) {
  const { host, path } = await ctx.params;
  // La barra final se lee de la URL, NO de `path`: el catch-all de Next se come
  // el segmento vacío y entrega ["blog"] tanto para /blog como para /blog/.
  const url = new URL(req.url);
  const r = await resolvePublicSite(
    { store: projectStore, storage: getStorage() },
    {
      host: decodeURIComponent(host),
      platformHost: process.env.PLATFORM_HOST ?? "localhost:3000",
      sitesBaseDomain: process.env.SITES_BASE_DOMAIN ?? process.env.PLATFORM_HOST ?? "localhost:3000",
      pathSegments: path ?? [],
      conBarra: url.pathname.endsWith("/"),
      // Para que una redirección (barra final, www→pelado) no se coma el
      // `?utm_source=...` con el que llega la gente desde una campaña.
      search: url.search,
      // Solo para el idioma de la 404. El sello de las webs publicadas NO usa
      // esto: se pone en el idioma de la propia página (ver idioma-pagina.ts).
      acceptLanguage: req.headers.get("accept-language"),
    }
  );
  const headers: Record<string, string> = { "content-type": r.contentType, "cache-control": r.cacheControl, ...r.headers };
  if (r.location) headers.location = r.location;
  return new Response(new Uint8Array(r.body), { status: r.status, headers });
}
