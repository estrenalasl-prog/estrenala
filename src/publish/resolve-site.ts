import { parseHost } from "./host";
import { conMarca } from "./marca";
import { ROBOTS_NOINDEX, cabeceraCanonica, sitemapDeLasPaginas, reapuntarCanonicos } from "./seo";
import { puede } from "@/src/planes/planes";
import type { StorageAdapter } from "@/src/storage/types";
import type { ProjectStore } from "@/src/repositories/types";

export type PublicResponse = {
  status: number; body: Buffer; contentType: string; cacheControl: string;
  location?: string;
  /** Cabeceras extra (en minúsculas) que la ruta añade tal cual a la respuesta. */
  headers?: Record<string, string>;
};

// El host llega de la cabecera Host: se escapa siempre antes de interpolarlo.
function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

// Página pública 404 con el sistema visual Estrénala (docs/design/07-404-publica.html).
// Autocontenida: sin assets ni fuentes externas (se sirve desde el dominio del cliente),
// por eso usa el stack de sistema en vez de Space Grotesk.
function pagina404(mensaje: string, opciones?: { host?: string; platformHost?: string }): PublicResponse {
  const m = esc(mensaje);
  const host = opciones?.host ? esc(opciones.host) : null;
  const plataforma = opciones?.platformHost ? esc(opciones.platformHost) : null;
  const html = `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${m} — Estrénala</title><meta name="robots" content="noindex">
<style>
:root{--lienzo:#F5F6F1;--superficie:#FFF;--superficie-2:#ECEDE4;--borde:#DEDFD6;--borde-fuerte:#C9CABF;
--texto:#141509;--texto-2:#55584C;--texto-3:#9A9C8F;--acento:#C4F000;--acento-vivo:#B4E000;--acento-texto:#5E7300;
--sans:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;--mono:ui-monospace,Consolas,monospace}
*{box-sizing:border-box}html,body{height:100%}
body{margin:0;background:var(--lienzo);color:var(--texto);font:16px/1.6 var(--sans);-webkit-font-smoothing:antialiased;display:flex;flex-direction:column}
a{color:var(--acento-texto);text-decoration:none}a:hover{color:var(--texto)}
::selection{background:var(--acento);color:var(--texto)}
.top{display:flex;align-items:center;padding:22px 28px}
.wordmark{font:700 17px/1 var(--sans);letter-spacing:-.03em}
.wordmark .hl{background:var(--acento);color:var(--texto);padding:0 4px;border-radius:4px}
.btn{display:inline-flex;align-items:center;justify-content:center;height:46px;padding:0 22px;border-radius:9px;
font:600 15px var(--sans);border:1px solid transparent}
.btn-primario{background:var(--acento);color:var(--texto);box-shadow:0 1px 2px rgba(20,21,9,.06)}
.btn-primario:hover{background:var(--acento-vivo);color:var(--texto)}
.centro{flex:1;display:grid;place-items:center;padding:20px 28px 40px}
.caja{max-width:560px;text-align:center}
.glifo{width:76px;height:76px;border-radius:20px;background:var(--texto);color:var(--acento);display:grid;place-items:center;
margin:0 auto 26px;font-size:30px;font-weight:700;box-shadow:0 4px 14px -3px rgba(20,21,9,.12)}
.direccion{display:inline-flex;align-items:center;gap:8px;background:var(--superficie);border:1px solid var(--borde);
border-radius:999px;padding:6px 14px;font:500 13px var(--mono);color:var(--texto-2);margin-bottom:22px}
.direccion .pt{width:7px;height:7px;border-radius:50%;background:var(--texto-3)}
h1{font-size:32px;font-weight:700;letter-spacing:-.03em;margin:0 0 12px;line-height:1.15;text-wrap:balance}
.lead{color:var(--texto-2);font-size:17px;margin:0 auto 30px;max-width:440px;text-wrap:pretty}
.promo{border-top:1px solid var(--borde);background:var(--superficie)}
.promo-int{max-width:920px;margin:0 auto;padding:26px 28px;display:flex;align-items:center;gap:20px;flex-wrap:wrap}
.promo .eyebrow{font:600 11px/1 var(--sans);letter-spacing:.14em;text-transform:uppercase;color:var(--acento-texto)}
.promo h2{font-size:19px;font-weight:700;letter-spacing:-.02em;margin:8px 0 4px}
.promo p{margin:0;color:var(--texto-2);font-size:14px;max-width:520px}
.promo .txt{flex:1;min-width:240px}
.pie{text-align:center;padding:18px;color:var(--texto-3);font-size:12.5px}
@media (max-width:560px){h1{font-size:26px}.lead{font-size:15px}.btn{width:100%}}
</style></head><body>
<div class="top"><span class="wordmark">Estrénal<span class="hl">a</span></span></div>
<div class="centro"><div class="caja">
<div class="glifo">404</div>
${host ? `<div class="direccion"><span class="pt"></span>${host}</div>` : ""}
<h1>${m}</h1>
<p class="lead">Si esta dirección es tuya, entra en Estrénala para publicarla o revisar su contenido.</p>
${plataforma ? `<a class="btn btn-primario" href="//${plataforma}">Entrar en Estrénala</a>` : ""}
</div></div>
<div class="promo"><div class="promo-int"><div class="txt">
<div class="eyebrow">Hecho con Estrénala</div>
<h2>¿Tienes una web hecha con IA y no sabes cómo subirla?</h2>
<p>Estrénala la pone online en un clic, la editas sin código haciendo clic sobre ella, y su blog escribe solo.</p>
</div></div></div>
<div class="pie">Estrénala · Tu web hecha con IA, por fin en directo.</div>
</body></html>`;
  return { status: 404, body: Buffer.from(html, "utf-8"), contentType: "text/html; charset=utf-8", cacheControl: "no-cache" };
}

export async function resolvePublicSite(
  deps: { store: ProjectStore; storage: StorageAdapter },
  input: { host: string; platformHost: string; sitesBaseDomain?: string; pathSegments: string[] }
): Promise<PublicResponse> {
  const h = parseHost(input.host, input.platformHost, input.sitesBaseDomain ?? input.platformHost);
  const marca = { host: input.host, platformHost: input.platformHost };
  if (h.tipo === "plataforma" || h.tipo === "raiz" || h.tipo === "desconocido") return pagina404("Esta web no está publicada", marca);

  // Guard de traversal: evalúa justo después de parseHost, antes de cualquier lookup
  if (input.pathSegments.some((s) => s === ".." || s.includes("/") || s.includes("\\"))) {
    return { status: 400, body: Buffer.from("Ruta no válida"), contentType: "text/plain; charset=utf-8", cacheControl: "no-cache" };
  }

  // www.cliente.com → 301 al dominio pelado (canónico), si ese pelado está publicado.
  if (h.tipo === "dominio" && h.valor.startsWith("www.")) {
    const pelado = h.valor.slice(4);
    const canonico = await deps.store.getPublishedSiteByHost({ dominio: pelado });
    if (canonico) {
      const ruta = input.pathSegments.length > 0 ? "/" + input.pathSegments.join("/") : "/";
      return {
        status: 301, body: Buffer.alloc(0), contentType: "text/plain; charset=utf-8",
        cacheControl: "no-cache", location: `https://${pelado}${ruta}`,
      };
    }
  }

  const site = h.tipo === "subdominio"
    ? await deps.store.getPublishedSiteByHost({ subdominio: h.valor })
    : await deps.store.getPublishedSiteByHost({ dominio: h.valor });
  if (!site) return pagina404("Esta web no está publicada", marca);

  const rel = input.pathSegments.length > 0 ? input.pathSegments.join("/") : site.entryPath;
  const file = await deps.storage.get(site.storagePrefix + rel);

  // Sitemap de emergencia: solo si la web no trae el suyo (ni del ZIP ni escrito
  // por el blog). A quien ha pedido no salir en Google no se le fabrica ninguno.
  if (!file && rel === "sitemap.xml" && !site.noIndexar) {
    const base = `https://${site.dominio ?? input.host}`;
    const xml = sitemapDeLasPaginas({
      claves: await deps.storage.list(site.storagePrefix),
      prefijo: site.storagePrefix,
      base,
      entryPath: site.entryPath,
    });
    return {
      status: 200, body: Buffer.from(xml, "utf-8"),
      contentType: "application/xml; charset=utf-8", cacheControl: "public, max-age=3600",
    };
  }
  if (!file) return pagina404("No encontrado", marca);

  // HTML publicado: se sirve TAL CUAL (sin anotar, sin reescribir, sin <base>) — las
  // rutas root-absolutas resuelven al mismo host → mismo proyecto. La ÚNICA
  // excepción es la insignia del plan gratuito, que se añade aquí al vuelo para
  // que aparezca y desaparezca con el plan sin tener que republicar.
  const esHtml = /\.html?$/i.test(rel);
  let body = file.body;
  if (esHtml) {
    let html = body.toString("utf-8");
    // Con dominio propio, el blog dejó escrito dentro del HTML el canónico
    // apuntando al subdominio: se reapunta aquí (ver seo.ts). Va ANTES de la
    // marca para no tocarla, que ya nace con la dirección buena.
    if (site.dominio && site.subdominio) {
      html = reapuntarCanonicos(
        html,
        `https://${site.subdominio}.${input.sitesBaseDomain ?? input.platformHost}`,
        `https://${site.dominio}`
      );
    }
    if (!puede(site.plan, "sinMarca")) html = conMarca(html, input.platformHost);
    body = Buffer.from(html, "utf-8");
  }

  // Lo que se le dice a Google (ver seo.ts). Excluyentes: un noindex con canónico
  // se contradice, y manda el noindex — el dueño ha pedido no aparecer.
  const headers: Record<string, string> = {};
  if (site.noIndexar) {
    headers["x-robots-tag"] = ROBOTS_NOINDEX;
  } else if (esHtml && h.tipo === "subdominio" && site.dominio) {
    headers.link = cabeceraCanonica(site.dominio, input.pathSegments);
  }

  return {
    status: 200, body, contentType: file.contentType,
    cacheControl: esHtml ? "no-cache" : "public, max-age=300",
    ...(Object.keys(headers).length > 0 ? { headers } : {}),
  };
}
