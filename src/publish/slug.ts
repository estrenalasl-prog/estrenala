// Subdominios que ningún cliente puede pedir porque son NUESTROS. Dos familias:
// los que ya existen en el DNS de la plataforma y los que vamos a necesitar.
//
// `send` no es teórico: `send.estrenala.com` lleva el SPF y el MX de Resend (es su
// Return-Path). Y `analitica` es donde va a vivir Umami. Si un cliente se hubiera
// quedado antes con cualquiera de los dos, tendríamos su web peleándose con nuestra
// propia infraestructura en el mismo nombre.
export const RESERVADOS: readonly string[] = [
  "www", "api", "app", "admin", "mail", "ftp", "smtp", "studio", "wordclicks",
  "preview", "assets", "sites", "s", "blog", "dashboard", "panel", "cdn",
  "static", "ns1", "ns2",
  // Infraestructura real y prevista (2026-08-01)
  "send", "analitica", "analytics", "webmail", "status", "docs", "soporte", "ayuda",
];

const SLUG_RE = /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$/;

export function formatoSlugValido(s: string): boolean {
  return typeof s === "string" && SLUG_RE.test(s);
}

export function esReservado(s: string): boolean {
  return RESERVADOS.includes(s);
}

export function esSlugValido(s: string): boolean {
  return formatoSlugValido(s) && !esReservado(s);
}

// Nombre de proyecto → etiqueta DNS: minúsculas, sin acentos (NFD), símbolos → "-",
// guiones colapsados y recortados, máx. 63. Vacío → "sitio".
export function slugify(nombre: string): string {
  let s = nombre
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  if (s.length > 63) s = s.slice(0, 63).replace(/-+$/g, "");
  return s || "sitio";
}
