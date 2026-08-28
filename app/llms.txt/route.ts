import { plataformaOculta } from "@/src/config/robots-plataforma";
import { urlPlataforma } from "@/src/config/sitio";
import { textoLlms } from "@/src/agentes/llms";

// Por lo mismo que robots.txt y sitemap.xml: la dirección sale del entorno del
// servidor, y estático se quedaría congelada la del build.
export const dynamic = "force-dynamic";

export function GET(): Response {
  // Escondida, no hay índice que dar. Un archivo que invita a leerlo todo
  // mientras el robots.txt dice «no rastrees nada» son dos órdenes contrarias.
  if (plataformaOculta()) return new Response("No existe", { status: 404 });

  return new Response(textoLlms(urlPlataforma()), {
    headers: {
      "content-type": "text/plain; charset=utf-8",
      // Una hora: cambia solo cuando se publica un artículo, y así un agente
      // que lo pida en bucle no nos hace trabajar de balde.
      "cache-control": "public, max-age=3600",
    },
  });
}
