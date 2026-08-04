import { IDIOMAS, rutaDeIdioma, alternativasHreflang } from "@/src/i18n/idiomas";

/**
 * El sitemap de LA PLATAFORMA (estrenala.com). No el de las webs de clientes:
 * esas generan el suyo al servir (ver src/publish/).
 *
 * Hacía falta porque no había ninguno —`/sitemap.xml` daba 404— y es lo primero
 * que se le entrega a Search Console. Vendiendo «hacemos que Google te
 * encuentre», no tenerlo era la misma clase de vergüenza que nuestra propia
 * landing suspendiendo su examen de SEO.
 *
 * LO QUE ENTRA es solo lo que un buscador debería enseñar: la landing en sus
 * cinco idiomas y las cuatro páginas legales. El panel, la API, el login y el
 * registro NO — están en ZONAS_PRIVADAS y prohibidos en robots.txt, así que
 * meterlos aquí sería pedirle a Google dos cosas contrarias a la vez.
 */

/** Las legales, que son públicas y sí conviene que se indexen. */
const LEGALES = [
  "/legal/aviso-legal",
  "/legal/privacidad",
  "/legal/terminos",
  "/legal/cookies",
] as const;

export type EntradaSitemap = {
  url: string;
  changeFrequency: "weekly" | "monthly";
  priority: number;
  alternates?: { languages: Record<string, string> };
};

const absoluta = (base: string, ruta: string) => new URL(ruta, base).toString();

export function sitemapPlataforma(base: string): EntradaSitemap[] {
  /**
   * Las cinco landings, cada una declarando a las otras cuatro.
   *
   * Sin el `hreflang`, cinco páginas que dicen lo mismo en distinto idioma son
   * contenido duplicado para Google: elige una y las otras cuatro no aparecen.
   * Va también en el HTML de cada una; ponerlo en los dos sitios es lo
   * recomendado, no un descuido.
   */
  const alt = alternativasHreflang();
  const languages: Record<string, string> = {};
  for (const [idioma, ruta] of Object.entries(alt)) languages[idioma] = absoluta(base, ruta);

  const landings: EntradaSitemap[] = IDIOMAS.map((i) => ({
    url: absoluta(base, rutaDeIdioma(i)),
    changeFrequency: "weekly",
    // La portada es la puerta de entrada; lo demás vive de ella.
    priority: 1,
    alternates: { languages },
  }));

  // Las legales van en español para todo el mundo a propósito (solo la de
  // cookies está traducida), así que NO llevan hreflang: declarar alternativas
  // que no existen es peor que no declarar ninguna.
  const legales: EntradaSitemap[] = LEGALES.map((ruta) => ({
    url: absoluta(base, ruta),
    changeFrequency: "monthly",
    priority: 0.3,
  }));

  return [...landings, ...legales];
}

/**
 * La línea `Sitemap:` del robots.txt.
 *
 * Solo cuando la plataforma está ABIERTA. Mientras el candado de pre-lanzamiento
 * esté puesto, el robots.txt dice «no rastrees nada»: anunciarle además un mapa
 * de lo que no debe mirar es contradecirse en el mismo archivo.
 */
export function urlSitemap(base: string): string {
  return absoluta(base, "/sitemap.xml");
}
