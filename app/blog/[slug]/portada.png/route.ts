import { articuloPorSlug } from "@/src/blog-estrenala/indice";
import { svgPortada } from "@/src/blog-estrenala/portada";
import { rasterizarPortadaPng } from "@/src/blog/portada/png";

// PNG y no SVG: WhatsApp, X y LinkedIn no enseñan SVG en la tarjeta del enlace,
// que es justo para lo que existe esto. El rasterizador es el mismo que usan las
// portadas de los blogs de clientes (WASM + la Space Grotesk del repo, nunca
// fuentes del sistema: mismos bytes en Windows y en el Docker de producción).
export const runtime = "nodejs";

export async function GET(_req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  const a = articuloPorSlug(slug);
  if (!a) return new Response("No existe", { status: 404 });

  const png = await rasterizarPortadaPng(svgPortada(a));
  return new Response(new Uint8Array(png), {
    headers: {
      "content-type": "image/png",
      // Un año: la portada solo cambia si cambia el título, y entonces cambia el
      // artículo entero. `immutable` evita que los rastreadores de redes
      // sociales la vuelvan a pedir cada vez que alguien pega el enlace.
      "cache-control": "public, max-age=31536000, immutable",
    },
  });
}
