import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { ARTICULOS, articuloPorSlug, rutaArticulo, RUTA_BLOG } from "@/src/blog-estrenala/indice";
import { cuerpoAHtml, datosEstructurados } from "@/src/blog-estrenala/render";
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
   * Sin esto el blog no existe para nadie: el middleware manda al 307 de /login
   * todo lo que no esté en su lista, y un artículo que redirige al login no se
   * indexa ni se lee.
   */
  it("el middleware deja pasar /blog y lo que cuelga de él", () => {
    const src = readFileSync(path.resolve(process.cwd(), "middleware.ts"), "utf8");
    const publicas = src.match(/const RUTAS_PUBLICAS = \[([\s\S]*?)\];/)?.[1];
    expect(publicas, "no se encuentra RUTAS_PUBLICAS").toBeTruthy();
    expect(publicas, "falta /blog: los artículos acabarían en el login").toContain('"/blog"');
  });
});
