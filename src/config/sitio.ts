// La dirección pública de la plataforma, como URL absoluta.
//
// Hace falta para los metadatos de compartir (og:image tiene que ser absoluta) y
// esos se calculan AL CONSTRUIR en las páginas estáticas, cuando PLATFORM_HOST
// todavía no existe: en Docker las variables se inyectan al arrancar, no al
// construir la imagen. Por eso en producción se cae a estrenala.com en vez de a
// localhost, que es lo que quedaría cocido en la landing.
import type { Entorno } from "./robots-plataforma";

export function urlPlataforma(env: Entorno = process.env): string {
  const host = (env.PLATFORM_HOST ?? "").trim().toLowerCase()
    || (env.NODE_ENV === "production" ? "estrenala.com" : "localhost:3000");
  // En local no hay TLS; fuera, siempre.
  const esLocal = /^(localhost|127\.0\.0\.1)(:|$)/.test(host);
  return `${esLocal ? "http" : "https"}://${host}`;
}
