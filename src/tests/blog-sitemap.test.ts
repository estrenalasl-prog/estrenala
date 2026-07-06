import { describe, it, expect } from "vitest";
import { actualizarSitemap, sitemapBase, quitarDelSitemap } from "@/src/blog/sitemap";

describe("actualizarSitemap", () => {
  it("crea un sitemap desde cero si no existe", () => {
    const xml = actualizarSitemap(null, [{ loc: "https://x.com/blog/a.html", lastmod: "2026-06-12" }]);
    expect(xml).toContain('<?xml version="1.0"');
    expect(xml).toContain("<loc>https://x.com/blog/a.html</loc>");
    expect(xml).toContain("<lastmod>2026-06-12</lastmod>");
  });
  it("añade una URL nueva a un sitemap existente sin tocar las demás", () => {
    const previo = actualizarSitemap(null, [{ loc: "https://x.com/", lastmod: "2026-01-01" }]);
    const xml = actualizarSitemap(previo, [{ loc: "https://x.com/blog/b.html", lastmod: "2026-06-12" }]);
    expect(xml).toContain("<loc>https://x.com/</loc>");
    expect(xml).toContain("<loc>https://x.com/blog/b.html</loc>");
  });
  it("si la URL ya existe, actualiza su lastmod en vez de duplicarla", () => {
    const previo = actualizarSitemap(null, [{ loc: "https://x.com/blog/a.html", lastmod: "2026-01-01" }]);
    const xml = actualizarSitemap(previo, [{ loc: "https://x.com/blog/a.html", lastmod: "2026-06-12" }]);
    expect(xml.match(/<loc>https:\/\/x\.com\/blog\/a\.html<\/loc>/g)).toHaveLength(1);
    expect(xml).toContain("<lastmod>2026-06-12</lastmod>");
    expect(xml).not.toContain("2026-01-01");
  });
  it("si el contenido previo no es un sitemap válido, crea uno nuevo", () => {
    const xml = actualizarSitemap("<html>no soy un sitemap</html>", [{ loc: "https://x.com/c", lastmod: "2026-06-12" }]);
    expect(xml).toContain("<urlset");
    expect(xml).toContain("<loc>https://x.com/c</loc>");
  });
  it("si la URL existe sin lastmod, le añade lastmod sin corromper otras URLs", () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://x.com/page.html</loc>
  </url>
  <url>
    <loc>https://x.com/other.html</loc>
    <lastmod>2026-01-01</lastmod>
  </url>
</urlset>`;
    const result = actualizarSitemap(xml, [{ loc: "https://x.com/page.html", lastmod: "2026-06-12" }]);
    expect(result).toContain("<lastmod>2026-06-12</lastmod>");
    expect(result).toContain("<lastmod>2026-01-01</lastmod>");
    expect(result.match(/<loc>https:\/\/x\.com\/page\.html<\/loc>/g)).toHaveLength(1);
  });
});

describe("quitarDelSitemap", () => {
  const xml = actualizarSitemap(null, [
    { loc: "https://x.com/blog/a.html", lastmod: "2026-01-01" },
    { loc: "https://x.com/blog/b.html", lastmod: "2026-01-02" },
  ]);
  it("elimina el bloque <url> completo de la loc y deja las demás", () => {
    const r = quitarDelSitemap(xml, "https://x.com/blog/a.html");
    expect(r).not.toContain("blog/a.html");
    expect(r).toContain("<loc>https://x.com/blog/b.html</loc>");
    expect(r).not.toContain("2026-01-01");
  });
  it("no-op si la loc no está", () => {
    expect(quitarDelSitemap(xml, "https://x.com/blog/z.html")).toBe(xml);
  });
  it("no confunde una loc que empieza igual", () => {
    const dos = actualizarSitemap(xml, [{ loc: "https://x.com/blog/a.html.old", lastmod: "2026-02-02" }]);
    const r = quitarDelSitemap(dos, "https://x.com/blog/a.html");
    expect(r).toContain("<loc>https://x.com/blog/a.html.old</loc>");
    expect(r).not.toContain("<loc>https://x.com/blog/a.html</loc>");
  });
});
