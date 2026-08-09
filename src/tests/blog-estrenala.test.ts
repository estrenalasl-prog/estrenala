import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { ARTICULOS, articuloPorSlug, rutaArticulo, RUTA_BLOG } from "@/src/blog-estrenala/indice";
import { anclaDe, conAnclas, cuerpoAHtml, datosEstructurados, rutaPortada } from "@/src/blog-estrenala/render";
import { otrosArticulos } from "@/src/blog-estrenala/indice";
import { svgPortada } from "@/src/blog-estrenala/portada";
import { FIGURAS, insertarFiguras } from "@/src/blog-estrenala/figuras";
import { fechaLarga, minutosDeLectura } from "@/src/blog-estrenala/tipos";
import { sitemapPlataforma } from "@/src/config/sitemap-plataforma";
import { ZONAS_PRIVADAS } from "@/src/config/robots-plataforma";

const BASE = "https://estrenala.com";

describe("los artículos del blog", () => {
  it("hay al menos uno", () => {
    expect(ARTICULOS.length).toBeGreaterThan(0);
  });

  it("ningún slug se repite y todos valen para una URL", () => {
    const slugs = ARTICULOS.map((a) => a.slug);
    expect(new Set(slugs).size, "hay slugs repetidos").toBe(slugs.length);
    for (const s of slugs) expect(s, s).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
  });

  it("vienen del más nuevo al más viejo", () => {
    const fechas = ARTICULOS.map((a) => a.fecha);
    expect([...fechas].sort((x, y) => y.localeCompare(x))).toEqual(fechas);
  });

  /** Un título largo lo corta Google; una descripción corta desperdicia sitio. */
  it("los títulos y las descripciones caben en un resultado de búsqueda", () => {
    for (const a of ARTICULOS) {
      expect(a.titulo.length, `título largo: ${a.slug}`).toBeLessThanOrEqual(60);
      expect(a.descripcion.length, `descripción corta: ${a.slug}`).toBeGreaterThanOrEqual(110);
      expect(a.descripcion.length, `descripción larga: ${a.slug}`).toBeLessThanOrEqual(165);
      expect(a.fecha, a.slug).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it("todos traen preguntas frecuentes, que es la mitad del posicionamiento", () => {
    for (const a of ARTICULOS) {
      expect(a.preguntas.length, a.slug).toBeGreaterThanOrEqual(3);
      for (const q of a.preguntas) {
        expect(q.p.endsWith("?"), `no es una pregunta: ${q.p}`).toBe(true);
        expect(q.r.length, `respuesta demasiado corta: ${q.p}`).toBeGreaterThan(40);
      }
    }
  });

  it("se encuentran por su slug, y lo que no existe no se inventa", () => {
    expect(articuloPorSlug(ARTICULOS[0].slug)).toBe(ARTICULOS[0]);
    expect(articuloPorSlug("no-existe")).toBeUndefined();
  });
});

describe("minutos de lectura", () => {
  it("200 palabras son un minuto", () => {
    expect(minutosDeLectura("palabra ".repeat(200))).toBe(1);
  });
  it("redondea hacia arriba: prometer de menos molesta más", () => {
    expect(minutosDeLectura("palabra ".repeat(201))).toBe(2);
  });
  it("nunca dice cero", () => {
    expect(minutosDeLectura("hola")).toBe(1);
    expect(minutosDeLectura("")).toBe(1);
  });
});

describe("la fecha en cristiano", () => {
  it("sale en español y sin desfase de zona horaria", () => {
    expect(fechaLarga("2026-08-09")).toBe("9 de agosto de 2026");
    // Con `new Date("2026-01-01")` interpretado en local, en España saldría el 31
    // de diciembre. De ahí el UTC explícito.
    expect(fechaLarga("2026-01-01")).toBe("1 de enero de 2026");
  });
});

describe("el cuerpo en HTML", () => {
  it("las tablas van dentro de una caja que se desplaza sola", () => {
    const html = cuerpoAHtml("| a | b |\n|---|---|\n| 1 | 2 |\n");
    expect(html).toContain('<div class="tabla-scroll"><table>');
    expect(html).toContain("</table></div>");
  });

  it("un texto sin tablas no gana ninguna caja", () => {
    expect(cuerpoAHtml("Hola **mundo**")).not.toContain("tabla-scroll");
  });

  it("todas las tablas de los artículos quedan envueltas", () => {
    for (const a of ARTICULOS) {
      const html = cuerpoAHtml(a.cuerpo);
      const abiertas = (html.match(/<table>/g) ?? []).length;
      const envueltas = (html.match(/<div class="tabla-scroll"><table>/g) ?? []).length;
      expect(envueltas, `${a.slug}: hay tablas sin envolver`).toBe(abiertas);
    }
  });
});

describe("lo que vas a leer", () => {
  it("todos los artículos lo traen, y son frases, no titulares", () => {
    for (const a of ARTICULOS) {
      expect(a.resumen.length, `${a.slug}: sin resumen`).toBeGreaterThanOrEqual(2);
      expect(a.resumen.length, `${a.slug}: demasiados puntos`).toBeLessThanOrEqual(4);
      for (const r of a.resumen) {
        expect(r.length, `${a.slug}: «${r}» es demasiado corto`).toBeGreaterThan(35);
        expect(r.endsWith("."), `${a.slug}: «${r}» sin punto final`).toBe(true);
      }
    }
  });

  /** Si repite la entradilla no aporta nada: una engancha, el otro informa. */
  it("no es una copia de la entradilla", () => {
    for (const a of ARTICULOS) {
      for (const r of a.resumen) expect(a.entradilla).not.toContain(r);
    }
  });
});

describe("los enlaces a una sección", () => {
  it("quita acentos y eñes, que al copiar el enlace salen ilegibles", () => {
    expect(anclaDe("La parte que de verdad se atraganta: el dominio"))
      .toBe("la-parte-que-de-verdad-se-atraganta-el-dominio");
    expect(anclaDe("Año español ¿qué?")).toBe("ano-espanol-que");
  });

  it("cada <h2> del artículo se puede enlazar", () => {
    for (const a of ARTICULOS) {
      const html = cuerpoAHtml(a.cuerpo);
      const sinAncla = [...html.matchAll(/<h2(?![^>]*\bid=)/g)];
      expect(sinAncla.length, `${a.slug}: hay <h2> sin id`).toBe(0);
      expect((html.match(/<h2 id="/g) ?? []).length, `${a.slug}: ningún h2`).toBeGreaterThan(2);
    }
  });

  it("dos títulos iguales no comparten identificador", () => {
    const html = conAnclas("<h2>Igual</h2><p>x</p><h2>Igual</h2>");
    expect(html).toContain('<h2 id="igual">');
    expect(html).toContain('<h2 id="igual-2">');
  });

  it("un título solo de símbolos no deja el id vacío", () => {
    expect(conAnclas("<h2>¿?¡!</h2>")).toContain('id="seccion"');
  });

  it("el marcado de dentro del título no se pierde", () => {
    expect(conAnclas("<h2>Con <em>énfasis</em></h2>")).toContain("<em>énfasis</em>");
  });
});

describe("los enlaces entre artículos", () => {
  it("un artículo nunca se enlaza a sí mismo", () => {
    for (const a of ARTICULOS) {
      expect(otrosArticulos(a.slug).map((o) => o.slug)).not.toContain(a.slug);
    }
  });

  it("con un solo artículo no se inventa una sección vacía", () => {
    if (ARTICULOS.length === 1) expect(otrosArticulos(ARTICULOS[0].slug)).toEqual([]);
  });

  it("no ofrece más de los que caben", () => {
    expect(otrosArticulos("nada", 2).length).toBeLessThanOrEqual(2);
  });
});

describe("la portada de cada artículo", () => {
  it("es SVG bien formado, del tamaño de una tarjeta social", () => {
    for (const a of ARTICULOS) {
      const svg = svgPortada(a);
      expect(svg.startsWith("<svg"), a.slug).toBe(true);
      expect(svg.endsWith("</svg>"), a.slug).toBe(true);
      expect(svg).toContain('width="1200" height="630"');
      expect(svg.split("<").length, "etiquetas sin cerrar").toBe(svg.split(">").length);
    }
  });

  it("el título entero cabe: nunca se recorta ni se sale", () => {
    for (const a of ARTICULOS) {
      const svg = svgPortada(a);
      // Todas las palabras del título tienen que estar dentro del SVG.
      for (const p of a.titulo.split(/\s+/)) {
        expect(svg, `falta «${p}» en la portada de ${a.slug}`).toContain(p);
      }
      expect((svg.match(/<tspan/g) ?? []).length, `${a.slug}: más de tres líneas`).toBeLessThanOrEqual(3);
    }
  });

  it("un título larguísimo baja el cuerpo en vez de desbordarse", () => {
    const largo = svgPortada({ titulo: "Palabra ".repeat(14).trim(), tema: "Prueba" });
    expect((largo.match(/<tspan/g) ?? []).length).toBeLessThanOrEqual(3);
    expect(largo).toContain('font-size="44"');
  });

  it("escapa lo que rompería el XML", () => {
    const svg = svgPortada({ titulo: 'Uno & <dos> "tres"', tema: "Prueba" });
    expect(svg).toContain("&amp;");
    expect(svg).not.toContain("<dos>");
  });

  it("cada artículo tiene su propia dirección de portada", () => {
    const rutas = ARTICULOS.map((a) => rutaPortada(a.slug));
    expect(new Set(rutas).size).toBe(rutas.length);
    for (const r of rutas) expect(r).toMatch(/^\/blog\/[a-z0-9-]+\/portada\.png$/);
  });
});

describe("las figuras", () => {
  it("el marcador se cambia por el dibujo y su pie", () => {
    const html = insertarFiguras("antes\n\n{{figura:que-falta}}\n\ndespués");
    expect(html).toContain("<figure class=\"figura\">");
    expect(html).toContain("<figcaption>");
    expect(html).not.toContain("{{figura:");
  });

  it("un nombre que no existe se queda tal cual, sin reventar", () => {
    expect(insertarFiguras("{{figura:no-existe}}")).toBe("{{figura:no-existe}}");
  });

  it("todas las figuras tienen título y descripción para quien no ve", () => {
    for (const [nombre, f] of Object.entries(FIGURAS)) {
      expect(f.svg, `${nombre}: sin role=img`).toContain('role="img"');
      expect(f.svg, `${nombre}: sin <title>`).toContain("<title");
      expect(f.svg, `${nombre}: sin <desc>`).toContain("<desc");
      expect(f.pie.length, `${nombre}: pie vacío`).toBeGreaterThan(20);
    }
  });

  it("no queda ningún marcador sin resolver en los artículos publicados", () => {
    for (const a of ARTICULOS) {
      expect(cuerpoAHtml(a.cuerpo), `${a.slug}: figura inexistente`).not.toContain("{{figura:");
    }
  });

  /** Dentro de un <p> el dibujo no es HTML válido y descoloca el aire. */
  it("el dibujo sale como bloque, no dentro de un párrafo", () => {
    const html = cuerpoAHtml("Un párrafo.\n\n{{figura:que-falta}}\n\nOtro párrafo.");
    expect(html).not.toMatch(/<p>\s*<figure/);
    expect(html, "el marcador deja su <p> vacío detrás").not.toMatch(/<p>\s*<\/p>/);
  });

  /**
   * ESTE es el test que faltaba el 09/08.
   *
   * El SVG llega ENTERO, byte a byte. Se metía en el Markdown antes de
   * convertirlo, y como en Markdown una línea en blanco termina un bloque de
   * HTML, marked cortaba el dibujo por la primera: el `</svg>` no aparecía nunca
   * y la mitad derecha salía como texto suelto debajo de la caja.
   *
   * El test que había entonces —«que no salga dentro de un párrafo»— pasaba en
   * verde con el dibujo roto: comprobaba el invariante equivocado.
   */
  it("el SVG llega entero al HTML, sin que Markdown lo parta", () => {
    const html = cuerpoAHtml("Antes.\n\n{{figura:que-falta}}\n\nDespués.");
    expect(html, "el SVG ha llegado troceado").toContain(FIGURAS["que-falta"].svg.trim());
    expect((html.match(/<svg/g) ?? []).length).toBe((html.match(/<\/svg>/g) ?? []).length);
  });

  it("las figuras de los artículos publicados también llegan enteras", () => {
    let comprobadas = 0;
    for (const a of ARTICULOS) {
      const html = cuerpoAHtml(a.cuerpo);
      for (const m of a.cuerpo.matchAll(/\{\{figura:([a-z0-9-]+)\}\}/g)) {
        const f = FIGURAS[m[1]];
        expect(f, `${a.slug}: la figura «${m[1]}» no existe`).toBeTruthy();
        expect(html, `${a.slug}: «${m[1]}» ha llegado troceada`).toContain(f.svg.trim());
        comprobadas++;
      }
    }
    // Sin esto, el día que ningún artículo lleve figura este test pasaría en
    // verde sin mirar nada, y eso no es lo mismo que estar bien.
    expect(comprobadas, "no se ha comprobado ninguna figura").toBeGreaterThan(0);
  });
});

describe("lo que se le cuenta a Google", () => {
  const a = ARTICULOS[0];
  const d = datosEstructurados(a, BASE) as { "@graph": Record<string, unknown>[] };

  it("declara artículo, preguntas y miga de pan", () => {
    expect(d["@graph"].map((n) => n["@type"])).toEqual(["Article", "FAQPage", "BreadcrumbList"]);
  });

  /**
   * Lo importante de este test: si las preguntas declaradas y las pintadas se
   * separan, Google lo trata como marcado engañoso. Salen del mismo sitio, y
   * esto lo vigila.
   */
  it("las preguntas declaradas son EXACTAMENTE las que se pintan", () => {
    const faq = d["@graph"][1] as { mainEntity: { name: string; acceptedAnswer: { text: string } }[] };
    expect(faq.mainEntity.map((q) => q.name)).toEqual(a.preguntas.map((q) => q.p));
    expect(faq.mainEntity.map((q) => q.acceptedAnswer.text)).toEqual(a.preguntas.map((q) => q.r));
  });

  it("todas las direcciones son absolutas", () => {
    for (const u of JSON.stringify(d).match(/"(https?:[^"]+|\/[^"]*)"/g) ?? []) {
      expect(u.startsWith('"http'), `dirección relativa: ${u}`).toBe(true);
    }
  });

  it("el artículo apunta a su propia página", () => {
    const art = d["@graph"][0] as { mainEntityOfPage: { "@id": string } };
    expect(art.mainEntityOfPage["@id"]).toBe(`${BASE}${rutaArticulo(a.slug)}`);
  });
});

describe("el blog está donde Google puede verlo", () => {
  it("el sitemap trae el índice y todos los artículos", () => {
    const urls = sitemapPlataforma(BASE).map((e) => e.url);
    expect(urls).toContain(`${BASE}${RUTA_BLOG}`);
    for (const a of ARTICULOS) expect(urls).toContain(`${BASE}${rutaArticulo(a.slug)}`);
  });

  it("el robots.txt no lo prohíbe", () => {
    for (const z of ZONAS_PRIVADAS) {
      expect(RUTA_BLOG.startsWith(z), `robots.txt bloquea el blog con "${z}"`).toBe(false);
    }
  });

  /**
   * Una página a la que no apunta NADIE es huérfana: Google llega solo por el
   * sitemap y no le pasa nada de la autoridad de la portada, que es la página
   * fuerte del sitio. El blog estuvo así desde que se creó hasta el 09/08 — el
   * `#blog` del pie es un ancla a la sección de producto, no al blog.
   */
  it("la portada enlaza al blog de verdad, no al ancla de la sección", () => {
    const src = readFileSync(path.resolve(process.cwd(), "app/_landing/Landing.tsx"), "utf8");
    expect(src, "la portada no enlaza a /blog: sería una página huérfana")
      .toMatch(/href="\/blog"/);
  });

  it("el middleware deja pasar /blog y lo que cuelga de él", () => {
    const src = readFileSync(path.resolve(process.cwd(), "middleware.ts"), "utf8");
    const publicas = src.match(/const RUTAS_PUBLICAS = \[([\s\S]*?)\];/)?.[1];
    expect(publicas, "no se encuentra RUTAS_PUBLICAS").toBeTruthy();
    expect(publicas, "falta /blog: los artículos acabarían en el login").toContain('"/blog"');
  });
});
