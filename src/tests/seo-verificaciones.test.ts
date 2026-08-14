import { describe, it, expect } from "vitest";
import { esVerificacion, pareceUnaPagina } from "@/src/seo/paginas";
import { paginasAExaminar, examinarProyecto, olvidarExamenes } from "@/src/seo/sitio";
import type { StorageAdapter } from "@/src/storage/types";
import { sitemapDeLasPaginas } from "@/src/publish/seo";
import { examinarSitio } from "@/src/seo/examen";

/**
 * Sebas, el 2026-08-13, pasando la web de StitchFlow: el examen le sacaba cuatro
 * fallos GRAVES —sin título, sin descripción, sin titular, no preparada para el
 * móvil— y los cuatro señalaban al mismo archivo:
 *
 *     google9f90e0696226c061.html
 *
 * Que es el archivo con el que Google comprueba que el dominio es tuyo. Su
 * contenido entero es una línea de texto plano, y tiene que ser EXACTAMENTE esa:
 * poniéndole un `<title>` para callar el aviso, se pierde la verificación del
 * dominio.
 *
 * O sea: cuatro alarmas rojas sin arreglo posible. Eso es peor que no enseñar
 * nada, porque enseña a ignorar las alarmas — que es justo lo que este examen
 * existe para evitar.
 */
const VERIFICACION_DE_GOOGLE = "google-site-verification: google9f90e0696226c061.html";

describe("los archivos de verificación no son páginas", () => {
  it("el de Google se reconoce por el nombre", () => {
    expect(esVerificacion("google9f90e0696226c061.html")).toBe(true);
  });

  it("y los de los demás buscadores", () => {
    expect(esVerificacion("yandex_1234abcd.html")).toBe(true);
    expect(esVerificacion("pinterest-a1b2c3.html")).toBe(true);
    expect(esVerificacion("BingSiteAuth.xml")).toBe(true);
    expect(esVerificacion(".well-known/algo.html")).toBe(true);
  });

  // La lista de nombres no puede ser tan ancha que se trague páginas de verdad.
  // «google-analytics.html» o «googlear-mejor.html» son páginas que alguien
  // escribió, y callarse sus fallos sería el error contrario.
  it("no se lleva por delante páginas que solo se llaman parecido", () => {
    for (const p of ["google.html", "google-analytics.html", "googlear-mejor.html",
                     "servicios/google-ads.html", "index.html", "blog/index.html"]) {
      expect(esVerificacion(p), `«${p}» no es una verificación`).toBe(false);
    }
  });

  // La red de seguridad para los buscadores que no conocemos: sin una sola
  // etiqueta no hay página que examinar.
  it("un archivo sin ninguna etiqueta no es una página", () => {
    expect(pareceUnaPagina(VERIFICACION_DE_GOOGLE)).toBe(false);
    expect(pareceUnaPagina("verificacion-rara-de-otro-buscador-12345")).toBe(false);
    expect(pareceUnaPagina("<!doctype html><html><body>hola</body></html>")).toBe(true);
    expect(pareceUnaPagina("<p>solo un trozo</p>")).toBe(true);
  });

  it("el examen ya no los mira", () => {
    const claves = ["s/", "s/index.html", "s/contacto.html", "s/google9f90e0696226c061.html"];
    expect(paginasAExaminar(claves, "s/", "index.html")).toEqual(["index.html", "contacto.html"]);
  });

  // El mismo criterio en el sitemap que le generamos a quien no trae el suyo:
  // ofrecerle a Google que indexe el papelito de la verificación es gastar
  // rastreo y arriesgarse a que salga en los resultados.
  it("y el sitemap tampoco los anuncia", () => {
    const xml = sitemapDeLasPaginas({
      claves: ["s/index.html", "s/contacto.html", "s/google9f90e0696226c061.html"],
      prefijo: "s/", base: "https://stitchflow.es", entryPath: "index.html",
    });
    expect(xml).toContain("https://stitchflow.es/");
    expect(xml).toContain("contacto");
    expect(xml).not.toContain("google9f90e0696226c061");
  });

  /**
   * El caso de Sebas de punta a punta, pasando por el examen ENTERO —listar,
   * leer y puntuar—: la misma web con y sin el archivo de verificación tiene que
   * dar exactamente la misma nota y decir que tiene las mismas páginas.
   *
   * Este es el que importa. Los de arriba comprueban las piezas; si el filtro se
   * cayera en cualquier punto del camino, es aquí donde se nota.
   */
  it("la nota y el recuento no cambian por tener el archivo de verificación", async () => {
    const pagina = `<!doctype html><html lang="es"><head><title>StitchFlow</title>
      <meta name="description" content="La app de crochet que organiza tus proyectos y tus lanas.">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <link rel="icon" href="/favicon.ico"></head>
      <body><h1>StitchFlow</h1><p>Tus proyectos de crochet, ordenados.</p></body></html>`;

    async function examinar(archivos: Record<string, string>, snapshotId: string) {
      olvidarExamenes();
      const storage: StorageAdapter = {
        async put() {}, async delete() {},
        async list(prefijo: string) { return Object.keys(archivos).filter((k) => k.startsWith(prefijo)); },
        async get(clave: string) {
          const v = archivos[clave];
          return v === undefined ? null : { body: Buffer.from(v, "utf-8"), contentType: "text/html" };
        },
      };
      return examinarProyecto(storage, { snapshotId, storagePrefix: "s/", entryPath: "index.html" });
    }

    const sin = await examinar({ "s/index.html": pagina }, "a");
    const con = await examinar(
      { "s/index.html": pagina, "s/google9f90e0696226c061.html": VERIFICACION_DE_GOOGLE },
      "b"
    );

    expect(con.nota).toBe(sin.nota);
    expect(con.fallos.map((f) => f.clave)).toEqual(sin.fallos.map((f) => f.clave));
    // Y que no diga «1 de 2 páginas» de una web que tiene una.
    expect(con.paginas).toEqual(sin.paginas);
  });

  // Y la comprobación que de verdad duele: metido como página, ese archivo SÍ
  // habría dado los cuatro graves. Así queda escrito de qué nos estamos
  // librando, y si alguien quita el filtro este test se lo recuerda.
  it("metido como página habría dado los cuatro graves que veía Sebas", () => {
    const examen = examinarSitio({
      paginas: [{ ruta: "google9f90e0696226c061.html", html: VERIFICACION_DE_GOOGLE }],
      totales: 1, portada: "index.html",
    });
    const claves = examen.fallos.map((f) => f.clave);
    for (const c of ["sinTitulo", "sinDescripcion", "sinH1", "sinViewport"]) {
      expect(claves, `faltaría «${c}»`).toContain(c);
    }
  });
});
