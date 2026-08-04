import { describe, it, expect } from "vitest";
import { gunzipSync, brotliDecompressSync } from "node:zlib";
import { randomBytes } from "node:crypto";
import {
  prepararEntrega, codificacionParaEl, sePuedeComprimir, etagDe, yaLaTiene,
} from "@/src/publish/entrega";

const HTML = "text/html; charset=utf-8";
const grande = (n = 4000) => Buffer.from("<p>hola qué tal cómo estamos</p>\n".repeat(n / 33));

const entregar = (extra: Partial<Parameters<typeof prepararEntrega>[0]> = {}) =>
  prepararEntrega({
    body: grande(), status: 200, contentType: HTML, headers: { "cache-control": "no-cache" },
    acceptEncoding: "gzip, deflate, br", ifNoneMatch: null, ...extra,
  });

describe("qué codificación se elige", () => {
  it("brotli manda sobre gzip cuando el navegador acepta las dos", () => {
    expect(codificacionParaEl("gzip, deflate, br")).toBe("br");
  });

  it("gzip si es lo único que acepta", () => {
    expect(codificacionParaEl("gzip, deflate")).toBe("gzip");
  });

  it("nada si no acepta ninguna, o si no manda la cabecera", () => {
    expect(codificacionParaEl("deflate")).toBeNull();
    expect(codificacionParaEl(null)).toBeNull();
    expect(codificacionParaEl("")).toBeNull();
  });

  /**
   * `br;q=0` significa «esto NO», no «esto sí». Leerlo como que lo acepta es
   * mandarle algo que ha pedido expresamente no recibir.
   */
  it("q=0 es un NO, no un sí", () => {
    expect(codificacionParaEl("br;q=0, gzip")).toBe("gzip");
    expect(codificacionParaEl("gzip;q=0, br;q=0")).toBeNull();
    expect(codificacionParaEl("gzip;q=0.0")).toBeNull();
  });

  it("no confunde un nombre que contiene a otro", () => {
    // «brotli-cosa» no es «br»; el \b lo separa.
    expect(codificacionParaEl("gzipfoo")).toBeNull();
  });
});

describe("qué se comprime y qué no", () => {
  it("el texto sí", () => {
    for (const t of [HTML, "text/css", "application/javascript", "application/json", "image/svg+xml", "application/xml"]) {
      expect(sePuedeComprimir(t, 5000), t).toBe(true);
    }
  });

  /**
   * Un JPEG o un woff2 YA están comprimidos: pasarlos por gzip gasta CPU en cada
   * visita para dejarlos igual o un poco más grandes.
   */
  it("lo que ya viene comprimido, no", () => {
    for (const t of ["image/jpeg", "image/png", "image/webp", "font/woff2", "application/zip", "video/mp4"]) {
      expect(sePuedeComprimir(t, 500000), t).toBe(false);
    }
  });

  it("lo diminuto tampoco: comprimirlo puede dejarlo más grande", () => {
    expect(sePuedeComprimir(HTML, 300)).toBe(false);
    expect(sePuedeComprimir(HTML, 1024)).toBe(true);
  });
});

describe("comprimir de verdad", () => {
  it("con brotli, y lo que llega se descomprime igual que el original", () => {
    const original = grande();
    const e = entregar({ body: original });
    expect(e.headers["content-encoding"]).toBe("br");
    expect(e.body!.length).toBeLessThan(original.length / 2);
    expect(brotliDecompressSync(e.body!).toString()).toBe(original.toString());
  });

  it("con gzip cuando es lo que hay", () => {
    const original = grande();
    const e = entregar({ body: original, acceptEncoding: "gzip" });
    expect(e.headers["content-encoding"]).toBe("gzip");
    expect(gunzipSync(e.body!).toString()).toBe(original.toString());
  });

  /**
   * Sin `Vary: Accept-Encoding`, una caché intermedia puede guardar la versión
   * comprimida y servírsela a un cliente que no la entiende — que la vería como
   * basura binaria.
   */
  it("añade Accept-Encoding al Vary SIN pisar el que ya hubiera", () => {
    const e = entregar({ headers: { vary: "Accept-Language" } });
    expect(e.headers.vary).toBe("Accept-Language, Accept-Encoding");
  });

  it("si el navegador no acepta nada, sale tal cual", () => {
    const original = grande();
    const e = entregar({ body: original, acceptEncoding: null });
    expect(e.headers["content-encoding"]).toBeUndefined();
    expect(e.body!.equals(original)).toBe(true);
  });

  it("una imagen sale tal cual aunque acepte brotli", () => {
    const foto = Buffer.alloc(50000, 7);
    const e = entregar({ body: foto, contentType: "image/jpeg" });
    expect(e.headers["content-encoding"]).toBeUndefined();
    expect(e.body!.equals(foto)).toBe(true);
  });

  /**
   * Con datos ya densos, comprimir puede salir MÁS grande. Mandar eso sería
   * cobrarle al navegador una descompresión a cambio de nada.
   */
  it("si comprimir no ahorra, se manda el original", () => {
    // Azar de VERDAD: incompresible por definición. El primer intento fue
    // `(i * 2654435761) % 256`, que parece ruido pero es periódico — brotli lo
    // dejaba en la mitad y el test fallaba teniendo el código razón.
    const azar = randomBytes(4000);
    const e = entregar({ body: azar, contentType: "text/plain" });
    expect(e.headers["content-encoding"]).toBeUndefined();
    expect(e.body!.equals(azar)).toBe(true);
  });
});

describe("ETag y 304", () => {
  it("el mismo contenido da el mismo ETag, y otro distinto da otro", () => {
    expect(etagDe(Buffer.from("hola"))).toBe(etagDe(Buffer.from("hola")));
    expect(etagDe(Buffer.from("hola"))).not.toBe(etagDe(Buffer.from("holA")));
  });

  it("es débil, porque va antes de comprimir", () => {
    expect(etagDe(Buffer.from("hola"))).toMatch(/^W\/"/);
  });

  it("se reconoce el que ya tiene el navegador", () => {
    const etag = etagDe(Buffer.from("hola"));
    expect(yaLaTiene(etag, etag)).toBe(true);
    expect(yaLaTiene(`"otro", ${etag}`, etag)).toBe(true);
    expect(yaLaTiene("*", etag)).toBe(true);
    expect(yaLaTiene('"otro"', etag)).toBe(false);
    expect(yaLaTiene(null, etag)).toBe(false);
  });

  it("la comparación ignora el W/, que es lo que manda la norma", () => {
    const etag = etagDe(Buffer.from("hola"));
    expect(yaLaTiene(etag.replace("W/", ""), etag)).toBe(true);
  });

  it("una respuesta normal lleva su ETag", () => {
    expect(entregar().headers.etag).toMatch(/^W\/"/);
  });

  /**
   * Es todo el objetivo: con ETag, la segunda visita recibe un 304 de dos líneas
   * en vez del archivo entero. Sin él, con `max-age=300`, a los cinco minutos se
   * lo baja todo otra vez.
   */
  it("si ya la tiene, 304 sin cuerpo", () => {
    const primera = entregar();
    const segunda = entregar({ ifNoneMatch: primera.headers.etag });
    expect(segunda.status).toBe(304);
    expect(segunda.body).toBeNull();
    // Un 304 no lleva cabeceras del cuerpo que no manda.
    expect(segunda.headers["content-type"]).toBeUndefined();
    expect(segunda.headers["content-encoding"]).toBeUndefined();
    // Pero sí las que le dicen cuánto puede seguir fiándose.
    expect(segunda.headers["cache-control"]).toBe("no-cache");
  });

  it("si tiene otra versión, se le manda la nueva entera", () => {
    const e = entregar({ ifNoneMatch: 'W/"deayer"' });
    expect(e.status).toBe(200);
    expect(e.body).not.toBeNull();
  });

  /**
   * En una redirección o un error el ETag no significa nada, y un 304 sobre una
   * redirección dejaría al navegador sin saber a dónde ir.
   */
  it("una redirección no lleva ETag ni se convierte en 304", () => {
    const e = prepararEntrega({
      body: Buffer.alloc(0), status: 308, contentType: HTML,
      headers: { location: "/blog/" }, acceptEncoding: "br", ifNoneMatch: "*",
    });
    expect(e.status).toBe(308);
    expect(e.headers.etag).toBeUndefined();
    expect(e.headers.location).toBe("/blog/");
  });

  it("una 404 tampoco se comprime a medias ni pierde su Vary", () => {
    const e = prepararEntrega({
      body: grande(), status: 404, contentType: HTML,
      headers: { vary: "Accept-Language" }, acceptEncoding: "br", ifNoneMatch: null,
    });
    expect(e.status).toBe(404);
    expect(e.headers.vary).toBe("Accept-Language");
  });
});
