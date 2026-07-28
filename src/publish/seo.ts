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
