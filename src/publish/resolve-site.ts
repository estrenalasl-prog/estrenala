import { parseHost } from "./host";
import { conMarca } from "./marca";
import {
  ROBOTS_NOINDEX, cabeceraCanonica, sitemapDeLasPaginas, reapuntarCanonicos,
  reapuntarMetadatosImportados, rutaPublica,
} from "./seo";
import { puede } from "@/src/planes/planes";
import { tieneExtensionConocida } from "@/src/storage/content-type";
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

/** Cómo se ha llegado al archivo: tal cual, por índice de carpeta, o por URL limpia. */
type Forma = "exacta" | "carpeta" | "limpia";

export async function resolvePublicSite(
  deps: { store: ProjectStore; storage: StorageAdapter },
  input: {
    host: string; platformHost: string; sitesBaseDomain?: string; pathSegments: string[];
    /**
     * Si la URL pedida acababa en «/». Viene aparte y NO se deduce de
     * `pathSegments` porque el catch-all de Next se come el segmento vacío: para
     * `/blog/` entrega `["blog"]`, igual que para `/blog`. Deducirlo de ahí hacía
     * que la redirección de más abajo apuntara a una dirección que vuelve a
     * llegar igual — un bucle infinito, medido en e2e-21 antes de desplegarlo.
     */
    conBarra?: boolean;
    /** La query tal cual (`?utm_source=x`), para no perderla al redirigir. */
    search?: string;
  }
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
        cacheControl: "no-cache", location: `https://${pelado}${ruta}${input.search ?? ""}`,
      };
    }
  }

  const site = h.tipo === "subdominio"
    ? await deps.store.getPublishedSiteByHost({ subdominio: h.valor })
    : await deps.store.getPublishedSiteByHost({ dominio: h.valor });
  if (!site) return pagina404("Esta web no está publicada", marca);

  // `rel` y `file` no son const a propósito: si la ruta no casa con ningún
  // archivo, más abajo se reintenta como carpeta o como URL limpia y AMBOS se
  // reasignan al archivo que se acabe sirviendo. Que `rel` acabe valiendo la ruta
  // REAL es lo que hace que todo lo de después siga siendo verdad: el `esHtml`,
  // la insignia del plan gratuito y el reapuntado de canónicos.
  const pedidaConBarra = input.conBarra ?? false;

  let rel = input.pathSegments.length > 0 ? input.pathSegments.join("/") : site.entryPath;
  let file = await deps.storage.get(site.storagePrefix + rel);

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
  // Resolución tipo servidor estático. Sin esto, la plataforma solo encuentra el
  // archivo cuando la URL coincide LETRA POR LETRA con su nombre guardado, y una
  // web perfectamente válida se cae a trozos: `/blog/` (una carpeta) o `/contacto`
  // (URL limpia, sin .html) daban 404 aunque `blog/index.html` y `contacto.html`
  // estuvieran subidos y correctos. Cualquier servidor estático —Nginx, Netlify,
  // Vercel, hasta `python -m http.server`— resuelve estas dos formas, así que las
  // webs vienen escritas dándolas por hechas. Es la mayoría de las webs con blog
  // o multipágina, no un caso raro.
  //
  // Se prueba la CARPETA antes que la página suelta: si existieran a la vez
  // `blog.html` y `blog/index.html`, gana el índice de la carpeta. No es un
  // empate teórico — es justo lo que pasa cuando alguien sube una web con su
  // `blog.html` y luego activa el blog de la plataforma, que escribe
  // `blog/index.html`. Lo que quiere ver entonces es su blog nuevo.
  //
  // Solo entra en el camino de «no encontrado», así que a las webs que van bien
  // no les cuesta ni una lectura de más. Y se salta si la ruta pide un archivo
  // conocido (`/favicon.ico`, que el navegador pide en cada visita y muchas webs
  // no traen) para no gastar dos lecturas inútiles en cada página vista.
  let forma: Forma = "exacta";
  if (!file && !tieneExtensionConocida(rel)) {
    const base = rel.replace(/\/+$/, "");
    // Los segmentos ya pasaron el guard de traversal de arriba; estos dos sufijos
    // son constantes nuestras, no entran por la URL.
    if (base) {
      const candidatos: [string, Forma][] = [[`${base}/index.html`, "carpeta"], [`${base}.html`, "limpia"]];
      for (const [candidato, comoSeLlego] of candidatos) {
        const alt = await deps.storage.get(site.storagePrefix + candidato);
        if (alt) { file = alt; rel = candidato; forma = comoSeLlego; break; }
      }
    }
  }

  if (!file) return pagina404("No encontrado", marca);

  // La barra final no es cosmética: decide dónde caen los enlaces RELATIVOS de
  // la página que estamos sirviendo, porque el navegador los resuelve contra la
  // URL, no contra el archivo.
  //
  //   blog/index.html en /blog   → href="foto.html" cae en /foto.html      ✗
  //   blog/index.html en /blog/  → href="foto.html" cae en /blog/foto.html ✓
  //   contacto.html  en /contacto  → href="equipo.html" → /equipo.html      ✓
  //   contacto.html  en /contacto/ → href="equipo.html" → /contacto/equipo.html ✗
  //
  // O sea que el índice de una carpeta la necesita y una URL limpia la estorba.
  // Por eso se redirige a la forma correcta en vez de servir en cualquiera de
  // las dos: además de arreglar los enlaces, deja UNA sola dirección buena por
  // página y no le regala a Google contenido duplicado. Es lo que hacen Apache
  // y Nginx, y la razón de apagar la normalización de Next (ver next.config.ts).
  // Solo la quiere el índice de una carpeta. Un archivo servido tal cual tampoco
  // la quiere, así que `/contacto.html/` también se normaliza: así cada página
  // tiene UNA dirección buena y no dos con el mismo contenido.
  const laQuiere = forma === "carpeta";
  if (input.pathSegments.length > 0 && pedidaConBarra !== laQuiere) {
    return {
      status: 301, body: Buffer.alloc(0), contentType: "text/plain; charset=utf-8",
      cacheControl: "no-cache",
      location: rutaPublica(input.pathSegments, laQuiere) + (input.search ?? ""),
    };
  }

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
    // Y si la web se escribió para OTRO dominio —lo normal: la hizo con IA para
    // `suempresa.com` y la subió aquí—, su imagen de compartir apunta a un
    // archivo que allí no existe y WhatsApp enseña la tarjeta sin imagen. Se
    // reapunta a la dirección buena de este sitio, que es su dominio propio si
    // lo tiene conectado y si no el host por el que ha entrado (mismo criterio
    // que la cabecera canónica y el sitemap, para que los tres digan lo mismo).
    html = reapuntarMetadatosImportados(html, `https://${site.dominio ?? input.host}`);
    if (!puede(site.plan, "sinMarca")) html = conMarca(html, input.platformHost);
    body = Buffer.from(html, "utf-8");
  }

  // Lo que se le dice a Google (ver seo.ts). Excluyentes: un noindex con canónico
  // se contradice, y manda el noindex — el dueño ha pedido no aparecer.
  const headers: Record<string, string> = {};
  if (site.noIndexar) {
    headers["x-robots-tag"] = ROBOTS_NOINDEX;
  } else if (esHtml && h.tipo === "subdominio" && site.dominio) {
    // La dirección tal cual se sirve, con su barra o sin ella: si el canónico
    // dijera la otra forma, estaría señalando la que redirige.
    headers.link = cabeceraCanonica(site.dominio, rutaPublica(input.pathSegments, laQuiere));
  }

  return {
    status: 200, body, contentType: file.contentType,
    cacheControl: esHtml ? "no-cache" : "public, max-age=300",
    ...(Object.keys(headers).length > 0 ? { headers } : {}),
  };
}
