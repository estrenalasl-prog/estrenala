const TIPOS: Record<string, string> = {
  html: "text/html; charset=utf-8",
  htm: "text/html; charset=utf-8",
  css: "text/css; charset=utf-8",
  js: "text/javascript; charset=utf-8",
  mjs: "text/javascript; charset=utf-8",
  json: "application/json; charset=utf-8",
  svg: "image/svg+xml",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
  avif: "image/avif",
  ico: "image/x-icon",
  woff: "font/woff",
  woff2: "font/woff2",
  ttf: "font/ttf",
  otf: "font/otf",
  txt: "text/plain; charset=utf-8",
  xml: "application/xml; charset=utf-8",
  map: "application/json; charset=utf-8",
  eot: "application/vnd.ms-fontobject",
  webmanifest: "application/manifest+json",
  csv: "text/csv; charset=utf-8",
  // Vídeo
  mp4: "video/mp4",
  m4v: "video/mp4",
  webm: "video/webm",
  ogv: "video/ogg",
  mov: "video/quicktime",
  // Audio
  mp3: "audio/mpeg",
  m4a: "audio/mp4",
  wav: "audio/wav",
  aac: "audio/aac",
  oga: "audio/ogg",
  ogg: "audio/ogg",
  flac: "audio/flac",
};

function extension(pathOrName: string): string {
  return pathOrName.split(".").pop()?.toLowerCase() ?? "";
}

export function contentTypeFor(pathOrName: string): string {
  const ext = extension(pathOrName);
  return Object.hasOwn(TIPOS, ext) ? TIPOS[ext] : "application/octet-stream";
}

/**
 * ¿La ruta acaba en una extensión de archivo de las que sabemos servir?
 *
 * Sirve para distinguir «me piden un ARCHIVO» de «me piden una PÁGINA»: al
 * resolver una URL sin extensión hay que probar `ruta/index.html` y `ruta.html`
 * (ver resolve-site.ts), pero no tiene sentido hacerlo con `/favicon.ico`, que
 * el navegador pide en cada visita y muchas webs no traen.
 *
 * Se mira contra la tabla de extensiones conocidas y NO con algo como
 * /\.\w+$/, porque hay slugs que acaban en un punto y algo sin ser archivos:
 * `/precios-2024.5` o `/version-1.2` son páginas perfectamente normales.
 * `Object.hasOwn` a propósito: con `in`, una ruta `/x.constructor` daría true.
 */
export function tieneExtensionConocida(pathOrName: string): boolean {
  return Object.hasOwn(TIPOS, extension(pathOrName));
}
