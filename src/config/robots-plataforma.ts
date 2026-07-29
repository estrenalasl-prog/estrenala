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

export type ReglasRobots = { rules: { userAgent: string; allow?: string; disallow?: string | string[] } };

/** El robots.txt de la plataforma, según esté oculta o abierta. */
export function reglasRobots(oculta: boolean): ReglasRobots {
  return oculta
    ? { rules: { userAgent: "*", disallow: "/" } }
    : { rules: { userAgent: "*", allow: "/", disallow: ZONAS_PRIVADAS } };
}
