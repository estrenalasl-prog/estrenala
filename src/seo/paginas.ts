/**
 * Qué archivos de una web son PÁGINAS y cuáles no, aunque acaben en `.html`.
 *
 * Vive suelto porque lo necesitan dos sitios que tienen que decir lo mismo: el
 * examen de SEO (`seo/sitio.ts`) y el sitemap que le generamos a quien no trae
 * el suyo (`publish/seo.ts`). Si discreparan, el examen callaría sobre un
 * archivo que el sitemap sí le estaría ofreciendo a Google.
 *
 * El caso que lo trajo: los buscadores piden subir un archivo suelto para
 * demostrar que el dominio es tuyo, y su contenido tiene que ser EXACTAMENTE el
 * que ellos dan. El de Google es una sola línea de texto plano, sin una
 * etiqueta:
 *
 *     google-site-verification: google9f90e0696226c061.html
 *
 * Examinarlo como si fuera una página daba cuatro fallos graves —sin título,
 * sin descripción, sin titular, no preparada para el móvil— que además NO
 * TIENEN ARREGLO: poniéndole un `<title>` se pierde la verificación del
 * dominio. Lo levantó Sebas el 2026-08-13 pasando la web de StitchFlow.
 *
 * Cuatro alarmas rojas que el dueño no puede resolver son peores que no enseñar
 * nada: enseñan a ignorar las alarmas, que es justo lo que este examen existe
 * para evitar.
 */

const VERIFICACIONES = [
  /^google[0-9a-f]{16}\.html$/i,   // Search Console
  /^yandex_[0-9a-z]+\.html$/i,     // Yandex
  /^pinterest-[0-9a-z]+\.html$/i,  // Pinterest
  /^BingSiteAuth\.xml$/i,          // Bing
];

/** Un archivo de verificación de un buscador, reconocido por su nombre. */
export function esVerificacion(rel: string): boolean {
  // `.well-known/` es la carpeta estándar para esto mismo: verificaciones,
  // certificados, y nada que un visitante deba abrir.
  if (rel.startsWith(".well-known/")) return true;
  const nombre = rel.split("/").pop() ?? "";
  return VERIFICACIONES.some((re) => re.test(nombre));
}

/**
 * ¿Esto es una página, o un archivo suelto con extensión `.html`?
 *
 * La red por debajo de la lista de nombres: sin una sola etiqueta no hay página
 * que examinar. Cubre a los buscadores que no conocemos y a los que cambien de
 * formato, sin tener que ir detrás de cada uno.
 */
export function pareceUnaPagina(html: string): boolean {
  return /<[a-z][a-z0-9-]*[\s/>]/i.test(html);
}
