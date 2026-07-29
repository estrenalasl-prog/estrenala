// Cómo se le habla a Google al servir la web publicada de un cliente.
//
// Todo va en CABECERAS, nunca reescribiendo su HTML: el contrato de la
// plataforma es servir los archivos tal cual (ver resolve-site.ts), y así esto
// vale igual para un PDF o una imagen que para una página.

/** Valor de X-Robots-Tag cuando la web está en modo «que no me encuentren todavía». */
export const ROBOTS_NOINDEX = "noindex, nofollow";

/**
 * Cabecera `Link ... rel="canonical"`.
 *
 * Cuando hay dominio propio conectado, la MISMA web se sirve en dos direcciones
 * (mi-web.estrenala.com y midominio.com). Para Google eso es contenido duplicado
 * y reparte la autoridad entre las dos. Con esto se le dice cuál es la buena.
 *
 * A propósito NO es un 301 desde el subdominio: conectar un dominio no comprueba
 * el DNS (ver conectarDominio), así que redirigir dejaría la web inalcanzable por
 * ambos lados mientras el DNS no apunte. El canónico resuelve el SEO sin ese riesgo.
 */
export function cabeceraCanonica(dominio: string, pathSegments: string[]): string {
  const ruta = pathSegments.length > 0 ? "/" + pathSegments.map(encodeURIComponent).join("/") : "/";
  return `<https://${dominio}${ruta}>; rel="canonical"`;
}

/**
 * Sitemap de emergencia para las webs que no tienen ninguno.
 *
 * Hasta ahora solo se generaba `sitemap.xml` al publicar artículos del blog, así
 * que una web de cinco páginas subida en ZIP no tenía ninguno —y para un sitio
 * recién nacido, sin enlaces entrantes, el sitemap es lo que acelera que Google
 * lo encuentre—. Este se calcula AL SERVIR, mirando qué páginas hay dentro:
 * no hay que republicar para que aparezca una página nueva.
 *
 * Solo se usa cuando el sitio NO trae el suyo. Si el cliente subió uno, o si el
 * blog ya lo escribió, manda el suyo y aquí no se toca nada.
 */
export function sitemapDeLasPaginas(input: {
  /** Claves completas del almacenamiento, incluido el prefijo del snapshot. */
  claves: string[];
  prefijo: string;
  /** Base pública sin barra final, p. ej. "https://micafe.com". */
  base: string;
  /** La página de inicio, que se anuncia como "/" y no por su nombre de archivo. */
  entryPath: string;
}): string {
  const paginas = input.claves
    .map((k) => (k.startsWith(input.prefijo) ? k.slice(input.prefijo.length) : k))
    .filter((rel) => /\.html?$/i.test(rel))
    // Las del blog ya las lista el sitemap del blog; y los parciales que empiezan
    // por "_" no son páginas que nadie deba visitar sueltas.
    .filter((rel) => !rel.split("/").some((t) => t.startsWith("_")));

  const rutas = new Set<string>();
  for (const rel of paginas) {
    rutas.add(rel === input.entryPath ? "/" : "/" + rel.split("/").map(encodeURIComponent).join("/"));
  }

  const urls = [...rutas].sort().map((r) => `  <url><loc>${input.base}${r}</loc></url>`).join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
}
