import { parseHost } from "./host";
import type { StorageAdapter } from "@/src/storage/types";
import type { ProjectStore } from "@/src/repositories/types";

export type PublicResponse = { status: number; body: Buffer; contentType: string; cacheControl: string };

function pagina404(mensaje: string): PublicResponse {
  const html = `<!doctype html><html lang="es"><head><meta charset="utf-8"><title>${mensaje}</title></head>` +
    `<body style="font-family:system-ui;display:grid;place-items:center;min-height:100vh;color:#374151">` +
    `<p>${mensaje}</p></body></html>`;
  return { status: 404, body: Buffer.from(html, "utf-8"), contentType: "text/html; charset=utf-8", cacheControl: "no-cache" };
}

export async function resolvePublicSite(
  deps: { store: ProjectStore; storage: StorageAdapter },
  input: { host: string; platformHost: string; pathSegments: string[] }
): Promise<PublicResponse> {
  const h = parseHost(input.host, input.platformHost);
  if (h.tipo === "plataforma" || h.tipo === "desconocido") return pagina404("Esta web no está publicada");

  const site = h.tipo === "subdominio"
    ? await deps.store.getPublishedSiteByHost({ subdominio: h.valor })
    : await deps.store.getPublishedSiteByHost({ dominio: h.valor });
  if (!site) return pagina404("Esta web no está publicada");

  if (input.pathSegments.some((s) => s === ".." || s.includes("/") || s.includes("\\"))) {
    return { status: 400, body: Buffer.from("Ruta no válida"), contentType: "text/plain; charset=utf-8", cacheControl: "no-cache" };
  }
  const rel = input.pathSegments.length > 0 ? input.pathSegments.join("/") : site.entryPath;
  const file = await deps.storage.get(site.storagePrefix + rel);
  if (!file) return pagina404("No encontrado");

  // HTML publicado: se sirve TAL CUAL (sin anotar, sin reescribir, sin <base>) — las
  // rutas root-absolutas resuelven al mismo host → mismo proyecto.
  const esHtml = /\.html?$/i.test(rel);
  return {
    status: 200, body: file.body, contentType: file.contentType,
    cacheControl: esHtml ? "no-cache" : "public, max-age=300",
  };
}
