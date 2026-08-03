import { describe, it, expect } from "vitest";
import { renderPost, itemsIndice, basePublica, fechaEnEspanol, DATOS_EJEMPLO, IMAGEN_EJEMPLO } from "@/src/blog/render";

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
  /** Se saca el JSON-LD ya inyectado, deshaciendo el escape del `<`. */
  const grafoDe = (h: string) =>
    JSON.parse(
      h.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)![1].replace(/\\u003c/g, "<")
    )["@graph"] as Record<string, unknown>[];

  it("el artículo dice también cuándo se actualizó y de qué página es", () => {
    const a = grafoDe(html)[0];
    expect(a).toMatchObject({
      "@type": "Article",
      dateModified: "2026-07-06",
      mainEntityOfPage: "https://acme.wc.app/blog/tu-y-yo.html",
    });
  });

  /**
   * Sin autor ni editor, Google trata el artículo como texto huérfano — y es de
   * lo poco de esta familia que HOY sigue contando. No hay hueco de plantilla
   * que diga de quién es el sitio, así que se lee de la plantilla ya rellena.
   */
  it("el autor y el editor salen del nombre del sitio, leído de la plantilla", () => {
    const tpl = TPL.replace("<title>{{titulo}}</title>", "<title>{{titulo}} | Blog de Acme</title>");
    const a = grafoDe(renderPost(tpl, post, "2026-07-06", "https://acme.wc.app"))[0];
    expect(a.author).toEqual({ "@type": "Organization", name: "Blog de Acme", url: "https://acme.wc.app/" });
    expect(a.publisher).toEqual(a.author);
  });

  it("si la plantilla no dice de quién es el sitio, no se inventa un autor", () => {
    const a = grafoDe(html)[0];
    expect(a.author).toBeUndefined();
    expect(a.publisher).toBeUndefined();
  });

  /**
   * Google retiró los resultados enriquecidos de FAQ el 7 de mayo de 2026, así
   * que esto no cambia nada en Google. Sigue porque es lo que leen ChatGPT y
   * Perplexity al rastrear: preguntas ya troceadas en vez de un muro de texto.
   */
  it("si el artículo trae preguntas, van en el mismo grafo", () => {
    const conFaq = {
      ...post,
      md: "## Qué es\n\nUna cosa que hace cosas y funciona bastante bien.\n\n### ¿Cuánto cuesta?\n\nDiez euros al mes, sin permanencia ninguna.\n\n### ¿Hay prueba gratis?\n\nSí, catorce días sin meter la tarjeta.\n",
    };
    const g = grafoDe(renderPost(TPL, conFaq, "2026-07-06", "https://a.b"));
    expect(g.map((n) => n["@type"])).toEqual(["Article", "FAQPage"]);
    const preguntas = g[1].mainEntity as Record<string, unknown>[];
    expect(preguntas.map((p) => p.name)).toEqual(["¿Cuánto cuesta?", "¿Hay prueba gratis?"]);
  });

  it("un artículo sin preguntas lleva solo el artículo", () => {
    expect(grafoDe(html).map((n) => n["@type"])).toEqual(["Article"]);
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
  // En el hueco {{fecha}} iba la fecha en crudo (2026-08-01), que es lo que
  // necesita Google pero NO lo que debe leer un visitante del blog de un cliente.
  describe("fechaEnEspanol", () => {
    it("la escribe como la lee una persona", () => {
      expect(fechaEnEspanol("2026-08-01")).toBe("1 de agosto de 2026");
      expect(fechaEnEspanol("2026-12-25")).toBe("25 de diciembre de 2026");
    });

    it("el día va sin cero delante", () => {
      expect(fechaEnEspanol("2026-03-09")).toBe("9 de marzo de 2026");
    });

    // Convertirla a Date la pondría a medianoche UTC, y en cualquier huso al
    // oeste el artículo saldría fechado el día anterior. Se formatea a mano.
    it("no se le va un día por el huso horario", () => {
      expect(fechaEnEspanol("2026-01-01")).toBe("1 de enero de 2026");
      expect(fechaEnEspanol("2026-12-31")).toBe("31 de diciembre de 2026");
    });

    it("lo que no es una fecha se devuelve tal cual, sin inventar nada", () => {
      expect(fechaEnEspanol("")).toBe("");
      expect(fechaEnEspanol("mañana")).toBe("mañana");
      expect(fechaEnEspanol("2026-13-01")).toBe("2026-13-01"); // mes que no existe
    });
  });

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
