import { getStorage } from "@/src/storage/factory";
import { projectStore } from "@/src/repositories/projects";
import { accountStore } from "@/src/repositories/accounts";
import { resolvePublicSite } from "@/src/publish/resolve-site";
import { parseHost } from "@/src/publish/host";
import { prepararEntrega } from "@/src/publish/entrega";
import {
  almacenConMemoria, storeConMemoria, comprimidoGuardado, guardarComprimido,
} from "@/src/publish/cache-servir";
import { RUTA_ENVIO } from "@/src/forms/conectar";
import { leerEnvio, cabeElEnvio, MAX_BYTES } from "@/src/forms/recibir";
import { avisarDelEnvio } from "@/src/forms/avisar";
import { paginaGracias } from "@/src/forms/gracias";
import { idiomaDeAcceptLanguage } from "@/src/i18n/idiomas";

export const runtime = "nodejs";

const entorno = () => ({
  platformHost: process.env.PLATFORM_HOST ?? "localhost:3000",
  sitesBaseDomain: process.env.SITES_BASE_DOMAIN ?? process.env.PLATFORM_HOST ?? "localhost:3000",
});

export async function GET(req: Request, ctx: { params: Promise<{ host: string; path?: string[] }> }) {
  const { host, path } = await ctx.params;
  // La barra final se lee de la URL, NO de `path`: el catch-all de Next se come
  // el segmento vacío y entrega ["blog"] tanto para /blog como para /blog/.
  const url = new URL(req.url);
  // Con memoria: sin esto, cada archivo de cada visita cuesta una consulta a
  // Postgres y una descarga de Supabase. Diez archivos por página son veinte
  // viajes de red para enseñar algo que no ha cambiado en una semana.
  const r = await resolvePublicSite(
    { store: storeConMemoria(projectStore), storage: almacenConMemoria(getStorage()) },
    {
      host: decodeURIComponent(host),
      ...entorno(),
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

  // Comprimir y ETag. Va aquí, en el último momento, porque necesita los bytes
  // definitivos —ya con el sello, la ficha y los formularios dentro— y porque
  // Next no comprime lo que devuelve un manejador de ruta (ver entrega.ts).
  const e = prepararEntrega({
    body: r.body,
    status: r.status,
    contentType: r.contentType,
    headers,
    acceptEncoding: req.headers.get("accept-encoding"),
    ifNoneMatch: req.headers.get("if-none-match"),
    guardado: comprimidoGuardado,
    guardar: guardarComprimido,
  });
  return new Response(e.body === null ? null : new Uint8Array(e.body), { status: e.status, headers: e.headers });
}

const html = (cuerpo: string, status = 200) =>
  new Response(cuerpo, {
    status,
    headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" },
  });

/**
 * Los formularios de las webs publicadas.
 *
 * Es la ÚNICA ruta de la plataforma que acepta un POST de cualquiera de internet
 * sin cuenta y sin sesión, así que todo lo de aquí es desconfianza:
 *
 *  - Solo responde en una ruta nuestra (`RUTA_ENVIO`). Cualquier otra dirección
 *    de la web del cliente da 405: son archivos estáticos, no aceptan envíos.
 *  - Solo si el dueño ha ENCENDIDO la recogida. Apagada, es como si no existiera.
 *  - Con tope de tamaño, de campos, de largo y de envíos por hora.
 *
 * A quien no pasa el filtro se le contesta la MISMA página de gracias que a quien
 * sí. A un robot no se le dice nunca por qué ha fallado —sabiéndolo prueba otra
 * cosa— y a una persona que se cruce con esto no se la deja preocupada.
 */
export async function POST(req: Request, ctx: { params: Promise<{ host: string; path?: string[] }> }) {
  const { host, path } = await ctx.params;
  const hostReal = decodeURIComponent(host);
  const ruta = `/${(path ?? []).join("/")}`;
  const idioma = idiomaDeAcceptLanguage(req.headers.get("accept-language"));

  if (ruta !== RUTA_ENVIO) {
    return new Response("Método no permitido", { status: 405, headers: { allow: "GET" } });
  }

  const { platformHost, sitesBaseDomain } = entorno();
  const h = parseHost(hostReal, platformHost, sitesBaseDomain);
  if (h.tipo === "plataforma" || h.tipo === "raiz" || h.tipo === "desconocido") {
    return new Response("No encontrado", { status: 404 });
  }

  const site = h.tipo === "subdominio"
    ? await projectStore.getPublishedSiteByHost({ subdominio: h.valor })
    : await projectStore.getPublishedSiteByHost({ dominio: h.valor });

  // Sin web publicada, o con la recogida apagada: aquí no hay nada que aceptar.
  if (!site || !site.recogeFormularios) return new Response("No encontrado", { status: 404 });

  // El tamaño se mira ANTES de leer el cuerpo: leer 400 MB para luego decidir que
  // sobran es haber pagado ya el ataque.
  const largo = Number(req.headers.get("content-length") ?? "0");
  if (largo > MAX_BYTES) return html(paginaGracias(idioma, "/"), 200);

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return html(paginaGracias(idioma, "/"), 200);
  }

  const leido = leerEnvio(form);
  // El freno se consulta DESPUÉS de la trampa: un robot que la rellena no debe
  // gastar cupo del formulario, o vaciándolo dejaría fuera a las personas.
  if (!leido.ok || !cabeElEnvio(site.projectId)) {
    return html(paginaGracias(idioma, leido.ok ? leido.envio.pagina : "/"), 200);
  }

  const { envio } = leido;
  await projectStore.guardarEnvio(site.projectId, envio);

  // El aviso NO puede tumbar el envío: si Resend está caído o sin cupo, el
  // mensaje ya está guardado y el dueño lo verá en su panel. Se registra y se
  // sigue.
  try {
    const correos = await accountStore.correosDePropietarios(site.orgId);
    await Promise.all(
      correos.map((para) =>
        avisarDelEnvio({ para, nombreWeb: hostReal, projectId: site.projectId, envio })
      )
    );
  } catch (e) {
    console.error("[formularios] no se pudo avisar por correo:", e instanceof Error ? e.message : e);
  }

  return html(paginaGracias(idioma, envio.pagina), 200);
}
