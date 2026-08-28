import { markdownDeRuta } from "@/src/agentes/markdown";
import { paginaDeSegmentos, TIPO_MD } from "@/src/agentes/rutas";
import { plataformaOculta, ROBOTS_NOINDEX } from "@/src/config/robots-plataforma";
import { urlPlataforma } from "@/src/config/sitio";

/**
 * La versión en Markdown de nuestras páginas de contenido.
 *
 * Aquí llega por dos caminos: reescrito desde el middleware cuando alguien pide
 * `/blog/loquesea` con `Accept: text/markdown`, o pedido directamente por un
 * agente que no sepa negociar. Los dos devuelven lo mismo.
 */
export const dynamic = "force-dynamic";

export async function GET(_req: Request, ctx: { params: Promise<{ ruta?: string[] }> }): Promise<Response> {
  if (plataformaOculta()) return new Response("No existe", { status: 404 });

  const { ruta } = await ctx.params;
  const md = markdownDeRuta(paginaDeSegmentos(ruta), urlPlataforma());
  if (md === null) return new Response("No existe", { status: 404 });

  return new Response(md, {
    headers: {
      "content-type": TIPO_MD,
      // Esto NO se indexa. Es el mismo contenido que la página de al lado, y dos
      // direcciones con lo mismo dentro es justo lo que hace que Google elija
      // una y descarte la otra — con la mala suerte de que podría quedarse con
      // esta, que es la que no tiene ni diseño ni enlaces.
      "x-robots-tag": ROBOTS_NOINDEX,
      "cache-control": "public, max-age=3600",
    },
  });
}
