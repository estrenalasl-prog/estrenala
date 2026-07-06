import { describe, it, expect } from "vitest";
import { renderIndex, type PostIndice } from "@/src/blog/blog-index";

const TPL = `<html><body><ul>
<!--POST--><li><a href="/blog/{{slug}}.html">{{titulo}}</a> — {{fecha}}</li><!--/POST-->
</ul></body></html>`;

const POSTS: PostIndice[] = [
  { titulo: "Post A", slug: "post-a", metaDescripcion: "da", fecha: "2026-06-12", imagen: "/blog/img/post-a.webp" },
  { titulo: "Post B", slug: "post-b", metaDescripcion: "db", fecha: "2026-06-10", imagen: "/blog/img/post-b.webp" },
];

describe("renderIndex", () => {
  it("repite el bloque item por cada post", () => {
    const html = renderIndex(TPL, POSTS);
    expect(html).toContain('<a href="/blog/post-a.html">Post A</a> — 2026-06-12');
    expect(html).toContain('<a href="/blog/post-b.html">Post B</a> — 2026-06-10');
    expect(html).not.toContain("<!--POST-->");
    expect(html).not.toContain("{{");
  });
  it("lanza error si la plantilla no tiene marcadores", () => {
    expect(() => renderIndex("<html></html>", POSTS)).toThrow(/marcadores/);
  });
  it("con lista vacía devuelve el HTML sin el bloque item y sin marcadores", () => {
    const html = renderIndex(TPL, []);
    expect(html).not.toContain("<!--POST-->");
    expect(html).toContain("<ul>");
  });
});
