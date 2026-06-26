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
};

export function contentTypeFor(pathOrName: string): string {
  const ext = pathOrName.split(".").pop()?.toLowerCase() ?? "";
  return TIPOS[ext] ?? "application/octet-stream";
}
