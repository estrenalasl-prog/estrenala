import type { ZipFile } from "./unzip";

const SEGURAS = new Set([
  "html", "htm", "css", "js", "mjs", "json", "svg",
  "png", "jpg", "jpeg", "gif", "webp", "avif", "ico",
  "woff", "woff2", "ttf", "otf", "eot",
  "txt", "xml", "map", "webmanifest", "csv",
  // Vídeo y audio (fondos, hero videos, etc.)
  "mp4", "m4v", "webm", "ogv", "mov",
  "mp3", "m4a", "wav", "aac", "oga", "ogg", "flac",
]);

function ext(p: string): string {
  return p.split(".").pop()?.toLowerCase() ?? "";
}

export function filtrarSeguros(files: ZipFile[]): {
  seguros: ZipFile[];
  ignorados: string[];
} {
  const seguros: ZipFile[] = [];
  const ignorados: string[] = [];
  for (const f of files) {
    if (SEGURAS.has(ext(f.path))) seguros.push(f);
    else ignorados.push(f.path);
  }
  return { seguros, ignorados };
}
