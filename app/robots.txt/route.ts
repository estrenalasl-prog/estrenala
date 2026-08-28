import { plataformaOculta, reglasRobots, textoRobots, SENALES_CONTENIDO } from "@/src/config/robots-plataforma";
import { urlSitemap } from "@/src/config/sitemap-plataforma";
import { urlPlataforma } from "@/src/config/sitio";

// Route handler y no el `robots.ts` de Next (que es lo que había hasta hoy):
// `MetadataRoute.Robots` solo sabe escribir Allow, Disallow y Sitemap, y aquí
// hace falta además la línea `Content-Signal` y su explicación. Lo que sale es
// byte por byte lo mismo de antes, más esas líneas.
//
// Dinámico a propósito, igual que antes: PLATAFORMA_NOINDEX se decide en el
// servidor (Dokploy), no al construir la imagen. Estático se quedaría congelado.
export const dynamic = "force-dynamic";

export function GET(): Response {
  const oculta = plataformaOculta();
  // Con la plataforma escondida no se declara nada: el archivo dice «no
  // rastrees», y ponerle al lado las condiciones de uso de lo que no debe
  // mirar es contradecirse en el mismo archivo (mismo criterio que el Sitemap).
  const cuerpo = textoRobots(
    reglasRobots(oculta, urlSitemap(urlPlataforma())),
    oculta ? undefined : SENALES_CONTENIDO
  );
  return new Response(cuerpo, { headers: { "content-type": "text/plain; charset=utf-8" } });
}
