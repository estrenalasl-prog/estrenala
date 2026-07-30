import { describe, it, expect } from "vitest";
import { contentTypeFor, tieneExtensionConocida } from "@/src/storage/content-type";

describe("contentTypeFor", () => {
  it("html", () => expect(contentTypeFor("index.html")).toBe("text/html; charset=utf-8"));
  it("css", () => expect(contentTypeFor("a/b/style.css")).toBe("text/css; charset=utf-8"));
  it("js", () => expect(contentTypeFor("app.js")).toBe("text/javascript; charset=utf-8"));
  it("png", () => expect(contentTypeFor("img/x.PNG")).toBe("image/png"));
  it("woff2", () => expect(contentTypeFor("f.woff2")).toBe("font/woff2"));
  it("mp4", () => expect(contentTypeFor("media/fondo.mp4")).toBe("video/mp4"));
  it("webm", () => expect(contentTypeFor("clip.WEBM")).toBe("video/webm"));
  it("mov", () => expect(contentTypeFor("old.mov")).toBe("video/quicktime"));
  it("mp3", () => expect(contentTypeFor("son.mp3")).toBe("audio/mpeg"));
  it("desconocido", () => expect(contentTypeFor("x.bin")).toBe("application/octet-stream"));

  it("una extensión que coincide con algo de Object.prototype no se cuela", () => {
    // Con `TIPOS[ext] ?? ...`, un archivo `logo.constructor` salía servido con
    // Content-Type «function Object() { [native code] }».
    for (const n of ["logo.constructor", "x.toString", "y.__proto__", "z.hasOwnProperty"]) {
      expect(contentTypeFor(n)).toBe("application/octet-stream");
    }
  });
});

describe("tieneExtensionConocida", () => {
  it("reconoce archivos", () => {
    for (const n of ["favicon.ico", "app.css", "img/x.PNG", "blog/x.html"]) {
      expect(tieneExtensionConocida(n)).toBe(true);
    }
  });

  it("una URL limpia NO es un archivo", () => {
    for (const n of ["contacto", "blog", "blog/mi-articulo"]) {
      expect(tieneExtensionConocida(n)).toBe(false);
    }
  });

  it("un slug que acaba en punto y algo tampoco lo es", () => {
    // El motivo de no usar /\.\w+$/: son páginas normales, no archivos.
    for (const n of ["precios-2024.5", "version-1.2", "guia-paso.a.paso"]) {
      expect(tieneExtensionConocida(n)).toBe(false);
    }
  });

  it("pero un slug que acaba en una extensión de verdad sí cuenta como archivo", () => {
    // `/tutorial-node.js` es ambiguo y se resuelve como archivo, igual que haría
    // Nginx o Netlify. Queda fijado a propósito para que nadie lo cambie sin verlo.
    expect(tieneExtensionConocida("tutorial-node.js")).toBe(true);
  });
});
