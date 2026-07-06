import { describe, it, expect } from "vitest";
import { renderPost, itemsIndice, basePublica, DATOS_EJEMPLO, IMAGEN_EJEMPLO } from "@/src/blog/render";

const TPL = `<html><head><title>{{titulo}}</title><meta name="description" content="{{meta_descripcion}}">
<link rel="canonical" href="{{canonical}}">{{json_ld}}</head>
<body><img src="{{imagen}}"><time>{{fecha}}</time><article>{{contenido}}</article></body></html>`;

describe("basePublica", () => {
  it("dominio propio gana", () => expect(basePublica({ dominio: "acme.com", subdominio: "acme" }, "wc.app")).toBe("https://acme.com"));
  it("subdominio con base", () => expect(basePublica({ dominio: null, subdominio: "acme" }, "wc.app")).toBe("https://acme.wc.app"));
  it("null sin ninguno", () => expect(basePublica({ dominio: null, subdominio: null }, "wc.app")).toBeNull());
});

describe("renderPost", () => {
  const post = { titulo: "Tú & yo", slug: "tu-y-yo", metaDescripcion: 'Meta "fina"', md: "## Hola\n\nParrafo.", imagenExt: "webp" };
  const html = renderPost(TPL, post, "2026-07-06", "https://acme.wc.app");
  it("escapa titulo/meta/fecha", () => {
    expect(html).toContain("Tú &amp; yo");
    expect(html).not.toContain('content="Meta "fina""');
  });
  it("markdown → HTML en contenido", () => expect(html).toContain("<h2>Hola</h2>"));
  it("imagen relativa y canonical absoluta", () => {
    expect(html).toContain('src="/blog/img/tu-y-yo.webp"');
    expect(html).toContain('href="https://acme.wc.app/blog/tu-y-yo.html"');
  });
  it("JSON-LD Article con image absoluta y </ escapado", () => {
    const h = renderPost(TPL, { ...post, titulo: "x</script><b>" }, "2026-07-06", "https://a.b");
    expect(h).toContain('"@type":"Article"');
    expect(h).toContain("https://a.b/blog/img/tu-y-yo.webp");
    expect(h).not.toContain("</script><b>\"");
  });
  it("imagenSrc sustituye la ruta de imagen (preview)", () => {
    const h = renderPost(TPL, post, "2026-07-06", "https://a.b", IMAGEN_EJEMPLO);
    expect(h).toContain(`src="${IMAGEN_EJEMPLO}"`);
  });
});

describe("itemsIndice", () => {
  it("escapa y construye la ruta de imagen", () => {
    const [i] = itemsIndice([{ titulo: "A&B", slug: "ab", metaDescripcion: "m", fecha: "2026-07-06", imagenExt: "png" }]);
    expect(i.titulo).toBe("A&amp;B");
    expect(i.imagen).toBe("/blog/img/ab.png");
  });
});

describe("escape en contexto de atributo", () => {
  it("un título con comillas no rompe og:title", () => {
    const tpl = '<head><meta property="og:title" content="{{titulo}}"></head><body><h1>{{titulo}}</h1>{{contenido}}{{meta_descripcion}}{{imagen}}{{fecha}}{{canonical}}{{json_ld}}</body>';
    const h = renderPost(tpl, { titulo: 'Guía "rápida" de IA', slug: "guia", metaDescripcion: "m", md: "hola", imagenExt: "png" }, "2026-07-06", "https://a.b");
    expect(h).toContain('content="Guía &quot;rápida&quot; de IA"');
    expect(h).not.toContain('content="Guía "rápida" de IA"');
  });
  it("itemsIndice escapa comillas en el título (alt del ítem)", () => {
    const [i] = itemsIndice([{ titulo: 'Foto "bonita"', slug: "f", metaDescripcion: "m", fecha: "2026-07-06", imagenExt: "png" }]);
    expect(i.titulo).toBe("Foto &quot;bonita&quot;");
  });
});
