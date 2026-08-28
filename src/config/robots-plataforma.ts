// Indexación de LA PLATAFORMA (estrenala.com), no de las webs de los clientes
// —esas tienen su interruptor por proyecto, en src/publish/seo.ts—.
//
// Módulo puro: lo usan app/robots.ts (Node) y middleware.ts (Edge).

/** Solo se leen un par de claves: no hace falta el ProcessEnv entero de Node. */
export type Entorno = Record<string, string | undefined>;

/** Valor de X-Robots-Tag mientras la plataforma esté oculta. */
export const ROBOTS_NOINDEX = "noindex, nofollow";

/**
 * Cabeceras de seguridad de LA PLATAFORMA. Nunca de las webs de clientes: su
 * HTML es suyo y se sirve tal cual, así que un `frame-ancestors` rompería a
 * quien incruste su propia web, y un HSTS con `includeSubDomains` le impondría
 * HTTPS en TODO su dominio, incluidos subdominios que no servimos nosotros.
 */
export const CABECERAS_SEGURIDAD: Record<string, string> = {
  // Un año, subdominios incluidos: todo *.estrenala.com va por HTTPS.
  "strict-transport-security": "max-age=31536000; includeSubDomains",
  // Que el navegador no adivine el tipo de un archivo por su contenido.
  "x-content-type-options": "nosniff",
  // Al salir a otro sitio no viaja la ruta completa del panel, solo el origen.
  "referrer-policy": "strict-origin-when-cross-origin",
  // Antisecuestro de clics: el panel no se incrusta en ningún lado.
  "content-security-policy": "frame-ancestors 'none'",
  // La plataforma no usa cámara, micrófono ni ubicación.
  "permissions-policy": "camera=(), microphone=(), geolocation=()",
};

/**
 * Para lo poco que el panel SÍ incrusta en un <iframe>: la vista previa de la
 * web del cliente, sus assets y wc-editor.js.
 *
 * `frame-ancestors 'none'` prohíbe TODO ancestro, también el del mismo origen.
 * Al aplicarlo a estas rutas (incremento 19) el preview se quedó en blanco con
 * «estrenala.com ha rechazado la conexión»: el panel se bloqueaba a sí mismo.
 * Con `'self'` se sigue impidiendo que lo incruste cualquier OTRO sitio, que es
 * de lo que protege esta cabecera.
 */
export const CABECERAS_SEGURIDAD_INCRUSTABLE: Record<string, string> = {
  ...CABECERAS_SEGURIDAD,
  "content-security-policy": "frame-ancestors 'self'",
};

/**
 * Candado de pre-lanzamiento: con PLATAFORMA_NOINDEX=1 la plataforma entera
 * queda fuera de los buscadores.
 *
 * Hace falta porque el dominio ya es público aunque no lo hayas enseñado a
 * nadie: al emitir el certificado, Let's Encrypt lo publica en los registros de
 * Certificate Transparency, y hay bots que los rastrean buscando dominios nuevos.
 * Se quita el día del lanzamiento.
 */
export function plataformaOculta(env: Entorno = process.env): boolean {
  const v = (env.PLATAFORMA_NOINDEX ?? "").trim().toLowerCase();
  return v === "1" || v === "true" || v === "si" || v === "sí";
}

/**
 * Zonas que no pintan nada en un buscador ni siquiera con la plataforma abierta:
 * el panel (detrás de sesión), la API y el papeleo de cuenta. Se listan por
 * prefijo, que es como los entiende robots.txt.
 */
export const ZONAS_PRIVADAS = [
  "/api/",
  "/projects/",
  "/settings",
  "/login",
  "/registro",
  "/verificar",
  "/recuperar",
  "/restablecer",
  "/invitacion",
  "/cambiar-email",
];

export type ReglasRobots = {
  rules: { userAgent: string; allow?: string; disallow?: string | string[] };
  sitemap?: string;
};

/**
 * El robots.txt de la plataforma, según esté oculta o abierta.
 *
 * El `Sitemap:` SOLO cuando está abierta: mientras el candado de pre-lanzamiento
 * esté puesto, este archivo dice «no rastrees nada», y anunciarle además un mapa
 * de lo que no debe mirar es contradecirse en el mismo archivo.
 */
/**
 * Señales de contenido (contentsignals.org): qué se puede hacer con lo que
 * publicamos, dicho en el propio robots.txt y una sola vez para todos.
 *
 * Robots.txt siempre ha servido para decir «no entres». No servía para decir
 * «entra, léelo, cítame, pero no lo metas en tu entrenamiento», que es
 * exactamente lo que queremos: nos interesa que un modelo nos lea y responda
 * citándonos —de ahí viven los artículos—, y no nos aporta nada que nuestro
 * texto acabe dentro de un modelo sin más.
 *
 * Es una reserva de derechos, no un candado técnico: quien quiera saltárselo
 * puede. Lo que da es una declaración escrita, con fecha y en el sitio donde se
 * mira, que antes no existía.
 */
export const SENALES_CONTENIDO = "search=yes, ai-input=yes, ai-train=no";

/**
 * El porqué de la línea de arriba, en cristiano y dentro del propio archivo.
 *
 * Va en el robots.txt a propósito: quien lo abre —una persona o el equipo legal
 * de alguien— tiene que poder entender qué se está declarando sin buscar la
 * especificación por ahí.
 */
const COMENTARIO_SENALES = [
  "# Content-Signal: qué se puede hacer con lo que publicamos aquí.",
  "#   search=yes    indexarlo y enlazarlo en un buscador: sí.",
  "#   ai-input=yes  usarlo para responder a alguien, citando la fuente: sí.",
  "#   ai-train=no   usarlo para entrenar un modelo: no.",
  "# Más en https://contentsignals.org",
].join("\n");

/**
 * El robots.txt como texto.
 *
 * Se escribe a mano y no con el generador de Next porque `MetadataRoute.Robots`
 * solo sabe de `Allow`, `Disallow` y `Sitemap`: no tiene dónde meter un
 * `Content-Signal` ni un comentario. El formato es EL MISMO que salía antes,
 * línea por línea, para que un buscador que ya lo tenía guardado no vea un
 * archivo distinto donde no ha cambiado nada.
 */
export function textoRobots(reglas: ReglasRobots, senales?: string): string {
  const lineas: string[] = [];
  if (senales) lineas.push(COMENTARIO_SENALES);
  lineas.push(`User-Agent: ${reglas.rules.userAgent}`);
  if (senales) lineas.push(`Content-Signal: ${senales}`);
  if (reglas.rules.allow) lineas.push(`Allow: ${reglas.rules.allow}`);
  const prohibido = reglas.rules.disallow;
  const lista = prohibido == null ? [] : Array.isArray(prohibido) ? prohibido : [prohibido];
  for (const ruta of lista) lineas.push(`Disallow: ${ruta}`);
  if (reglas.sitemap) lineas.push("", `Sitemap: ${reglas.sitemap}`);
  return lineas.join("\n") + "\n";
}

export function reglasRobots(oculta: boolean, sitemap?: string): ReglasRobots {
  if (oculta) return { rules: { userAgent: "*", disallow: "/" } };
  return {
    rules: { userAgent: "*", allow: "/", disallow: ZONAS_PRIVADAS },
    ...(sitemap ? { sitemap } : {}),
  };
}
