export function sitemapBase(): string {
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n</urlset>\n`;
}

function escaparRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function actualizarSitemap(
  xml: string | null,
  entradas: { loc: string; lastmod: string }[]
): string {
  let resultado = xml && xml.includes("<urlset") ? xml : sitemapBase();
  for (const { loc, lastmod } of entradas) {
    if (resultado.includes(`<loc>${loc}</loc>`)) {
      // No cruzar el límite del bloque <url> al buscar su <lastmod>
      const re = new RegExp(
        `(<loc>${escaparRegex(loc)}</loc>(?:(?!</url>)[\\s\\S])*?<lastmod>)[^<]*(</lastmod>)`
      );
      if (re.test(resultado)) {
        resultado = resultado.replace(re, `$1${lastmod}$2`);
      } else {
        // El bloque existe pero sin <lastmod>: añadirlo justo tras el <loc>
        resultado = resultado.replace(
          `<loc>${loc}</loc>`,
          `<loc>${loc}</loc>\n    <lastmod>${lastmod}</lastmod>`
        );
      }
    } else {
      const bloque = `  <url>\n    <loc>${loc}</loc>\n    <lastmod>${lastmod}</lastmod>\n  </url>\n`;
      resultado = resultado.replace("</urlset>", `${bloque}</urlset>`);
    }
  }
  return resultado;
}

// Elimina el bloque <url>…</url> cuyo <loc> coincide EXACTO (no-op si no está).
export function quitarDelSitemap(xml: string, loc: string): string {
  const re = new RegExp(
    `[ \\t]*<url>(?:(?!</url>)[\\s\\S])*?<loc>${escaparRegex(loc)}</loc>(?:(?!</url>)[\\s\\S])*?</url>[ \\t]*\\r?\\n?`
  );
  return xml.replace(re, "");
}
