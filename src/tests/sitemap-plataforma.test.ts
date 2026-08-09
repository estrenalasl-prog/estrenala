import { describe, it, expect } from "vitest";
import { sitemapPlataforma, urlSitemap } from "@/src/config/sitemap-plataforma";
import { reglasRobots, ZONAS_PRIVADAS } from "@/src/config/robots-plataforma";
import { ARTICULOS, rutaArticulo } from "@/src/blog-estrenala/indice";

const BASE = "https://estrenala.com";
const urls = () => sitemapPlataforma(BASE).map((e) => e.url);

describe("el sitemap de la plataforma", () => {
  /**
   * La lista sigue siendo CERRADA: los artículos se calculan a partir del
   * índice del blog, no se enumeran a mano, pero cualquier otra cosa que se
   * cuele aquí hace fallar el test. Es lo que impide que acabe apareciendo el
   * panel o una ruta de la API en el sitemap.
   */
  it("lleva las cinco landings, el blog con sus artículos y las cuatro legales, y nada más", () => {
    expect(urls().sort()).toEqual([
      "https://estrenala.com/",
      "https://estrenala.com/blog",
      ...ARTICULOS.map((a) => `https://estrenala.com${rutaArticulo(a.slug)}`),
      "https://estrenala.com/en",
      "https://estrenala.com/fr",
      "https://estrenala.com/it",
      "https://estrenala.com/legal/aviso-legal",
      "https://estrenala.com/legal/cookies",
      "https://estrenala.com/legal/privacidad",
      "https://estrenala.com/legal/terminos",
      "https://estrenala.com/pt",
    ].sort());
  });

  /** Se escriben para que Google los enseñe: mandan sobre el papeleo legal. */
  it("los artículos pesan más que las legales", () => {
    const e = sitemapPlataforma(BASE);
    const art = e.find((x) => x.url.includes(rutaArticulo(ARTICULOS[0].slug)))!;
    const legal = e.find((x) => x.url.includes("/legal/"))!;
    expect(art.priority).toBeGreaterThan(legal.priority);
  });

  /** Existen solo en español: declarar traducciones que no hay es peor que nada. */
  it("los artículos NO declaran alternativas de idioma", () => {
    const art = sitemapPlataforma(BASE).find((x) => x.url.includes("/blog/"))!;
    expect(art.alternates).toBeUndefined();
  });

  /**
   * Pedirle a Google que indexe lo que robots.txt le prohíbe es darle dos
   * órdenes contrarias, y en Search Console sale como aviso.
   */
  it("no cuela ninguna zona privada", () => {
    const rutas = urls().map((u) => new URL(u).pathname);
    for (const zona of ZONAS_PRIVADAS) {
      expect(rutas.some((r) => r.startsWith(zona))).toBe(false);
    }
  });

  /**
   * Sin hreflang, cinco páginas que dicen lo mismo en distinto idioma son
   * contenido duplicado: Google elige una y las otras cuatro no aparecen.
   */
  it("cada landing declara las cinco alternativas y el x-default", () => {
    const portada = sitemapPlataforma(BASE).find((e) => e.url === `${BASE}/`);
    const idiomas = portada?.alternates?.languages ?? {};
    expect(Object.keys(idiomas).sort()).toEqual(["en", "es", "fr", "it", "pt", "x-default"]);
    expect(idiomas.es).toBe("https://estrenala.com/");
    expect(idiomas.it).toBe("https://estrenala.com/it");
    // A quien no encaje en ninguno, a la raíz.
    expect(idiomas["x-default"]).toBe("https://estrenala.com/");
  });

  /** Las legales están solo en español a propósito (menos la de cookies). */
  it("las legales NO declaran alternativas que no existen", () => {
    const legal = sitemapPlataforma(BASE).find((e) => e.url.includes("/legal/terminos"));
    expect(legal?.alternates).toBeUndefined();
  });

  it("todas las direcciones son absolutas y del dominio que se le pasa", () => {
    for (const u of sitemapPlataforma("https://otra-marca.com").map((e) => e.url)) {
      expect(u.startsWith("https://otra-marca.com/")).toBe(true);
    }
  });

  it("la portada manda sobre las legales", () => {
    const e = sitemapPlataforma(BASE);
    const portada = e.find((x) => x.url === `${BASE}/`)!;
    const legal = e.find((x) => x.url.includes("/legal/"))!;
    expect(portada.priority).toBeGreaterThan(legal.priority);
  });
});

describe("el robots.txt y el sitemap", () => {
  it("abierta: se anuncia el sitemap", () => {
    const r = reglasRobots(false, urlSitemap(BASE));
    expect(r.sitemap).toBe("https://estrenala.com/sitemap.xml");
    expect(r.rules.allow).toBe("/");
  });

  /**
   * Con el candado puesto, el archivo dice «no rastrees nada»: anunciar además
   * un mapa de lo que no debe mirar es contradecirse en el mismo archivo.
   */
  it("oculta: prohíbe todo y NO anuncia sitemap", () => {
    const r = reglasRobots(true, urlSitemap(BASE));
    expect(r.rules.disallow).toBe("/");
    expect(r.sitemap).toBeUndefined();
  });

  it("sin sitemap que anunciar, no se inventa la clave", () => {
    expect(reglasRobots(false).sitemap).toBeUndefined();
  });
});
