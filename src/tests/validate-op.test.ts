import { describe, it, expect } from "vitest";
import { isValidOp, isSafeHref, isUuid } from "@/src/editor/validate-op";

const UUID = "11111111-2222-4333-8444-555555555555";

describe("isUuid", () => {
  it("acepta un uuid y rechaza basura", () => {
    expect(isUuid(UUID)).toBe(true);
    expect(isUuid("nope")).toBe(false);
  });
});

describe("isSafeHref", () => {
  it("acepta relativas, ancla, http(s), mailto, tel", () => {
    for (const h of ["/x", "x", "#a", "http://a.com", "https://a.com", "mailto:a@b.com", "tel:+1"]) {
      expect(isSafeHref(h)).toBe(true);
    }
  });
  it("rechaza javascript:, data: y esquemas desconocidos", () => {
    for (const h of ["javascript:alert(1)", " JavaScript:x", "data:text/html,x", "ftp://a"]) {
      expect(isSafeHref(h)).toBe(false);
    }
  });
  it("rechaza vacío", () => {
    expect(isSafeHref("   ")).toBe(false);
  });
  it("rechaza javascript con tab/newline incrustado o como prefijo", () => {
    expect(isSafeHref("java\tscript:alert(1)")).toBe(false);
    expect(isSafeHref("\njavascript:alert(1)")).toBe(false);
    expect(isSafeHref("javascript\n:alert(1)")).toBe(false);
    expect(isSafeHref("ja\rva\tscript:alert(1)")).toBe(false);
    expect(isSafeHref("d\tata:text/html,x")).toBe(false);
    expect(isSafeHref("DA\nTA:x")).toBe(false);
    expect(isSafeHref("vbscript:calc")).toBe(false);
    expect(isSafeHref("vb\tscript:calc")).toBe(false);
  });
});

describe("isValidOp", () => {
  it("text: válido si value es string", () => {
    expect(isValidOp({ page: "i", nodeId: 0, kind: "text", value: "x" })).toBe(true);
  });
  it("href: depende de isSafeHref", () => {
    expect(isValidOp({ page: "i", nodeId: 0, kind: "href", value: "/ok" })).toBe(true);
    expect(isValidOp({ page: "i", nodeId: 0, kind: "href", value: "javascript:x" })).toBe(false);
  });
  it("src: exige patrón /wc-uploads/<uuid>.<ext> y assetId que coincide", () => {
    expect(isValidOp({ page: "i", nodeId: 0, kind: "src", value: `/wc-uploads/${UUID}.png`, assetId: UUID })).toBe(true);
    expect(isValidOp({ page: "i", nodeId: 0, kind: "src", value: `/wc-uploads/${UUID}.exe`, assetId: UUID })).toBe(false);
    expect(isValidOp({ page: "i", nodeId: 0, kind: "src", value: `/otro/${UUID}.png`, assetId: UUID })).toBe(false);
    expect(isValidOp({ page: "i", nodeId: 0, kind: "src", value: `/wc-uploads/${UUID}.png`, assetId: "otro" })).toBe(false);
  });
  it("style: solo color con valor seguro", () => {
    expect(isValidOp({ page: "i", nodeId: 0, kind: "style", property: "color", value: "#ff0000" })).toBe(true);
    expect(isValidOp({ page: "i", nodeId: 0, kind: "style", property: "color", value: "rgb(1,2,3)" })).toBe(true);
    expect(isValidOp({ page: "i", nodeId: 0, kind: "style", property: "color", value: "red" })).toBe(true);
    expect(isValidOp({ page: "i", nodeId: 0, kind: "style", property: "color", value: "red; x: y" })).toBe(false);
    expect(isValidOp({ page: "i", nodeId: 0, kind: "style", property: "color", value: "url(x)" })).toBe(false);
  });
  it("style: rechaza una propiedad que no es color", () => {
    expect(isValidOp({ page: "i", nodeId: 0, kind: "style", property: "background", value: "red" } as unknown as Parameters<typeof isValidOp>[0])).toBe(false);
  });
  it("src: acepta assetId con mayúsculas (comparación case-insensitive)", () => {
    expect(isValidOp({ page: "i", nodeId: 0, kind: "src", value: `/wc-uploads/${UUID}.png`, assetId: UUID.toUpperCase() })).toBe(true);
  });
  it("rechaza kind desconocido", () => {
    expect(isValidOp({ kind: "otro" } as unknown as Parameters<typeof isValidOp>[0])).toBe(false);
  });
});

describe("isValidOp: textNode", () => {
  it("acepta value string e index entero ≥0", () => {
    expect(isValidOp({ page: "i.html", nodeId: 1, kind: "textNode", index: 0, value: "x" } as never)).toBe(true);
  });
  it("rechaza index negativo, no entero o value no string", () => {
    expect(isValidOp({ page: "i.html", nodeId: 1, kind: "textNode", index: -1, value: "x" } as never)).toBe(false);
    expect(isValidOp({ page: "i.html", nodeId: 1, kind: "textNode", index: 1.5, value: "x" } as never)).toBe(false);
    expect(isValidOp({ page: "i.html", nodeId: 1, kind: "textNode", index: 0, value: 3 } as never)).toBe(false);
  });
});

// Insertar una imagen ANADE HTML al documento, a diferencia de "src" que solo
// cambia el atributo de una que ya estaba. Las guardas son las mismas mas dos.
describe("isValidOp · insertImage", () => {
  const ok = (extra: Record<string, unknown> = {}) =>
    isValidOp({
      page: "i", nodeId: 0, kind: "insertImage",
      value: `/wc-uploads/${UUID}.webp`, assetId: UUID, alt: "Un gato", posicion: "despues",
      ...extra,
    } as never);

  it("acepta una op bien formada", () => {
    expect(ok()).toBe(true);
    expect(ok({ posicion: "antes" })).toBe(true);
  });

  it("la ruta tiene que ser un asset NUESTRO y coincidir con el assetId", () => {
    expect(ok({ value: `/otro/${UUID}.webp` })).toBe(false);
    expect(ok({ value: `/wc-uploads/${UUID}.exe` })).toBe(false);
    expect(ok({ value: "/wc-uploads/11111111-2222-4333-8444-999999999999.webp" })).toBe(false);
  });

  it("solo hay dos sitios posibles: ni inventados ni vacios", () => {
    for (const p of ["dentro", "arriba", "", null, undefined, 1]) {
      expect(ok({ posicion: p }), String(p)).toBe(false);
    }
  });

  // Sin `alt` la imagen es invisible para Google y para un lector de pantalla,
  // pero vacio es legitimo (imagen decorativa). Lo que no vale es que falte.
  it("el texto alternativo tiene que ser texto, y vacio vale", () => {
    expect(ok({ alt: "" })).toBe(true);
    expect(ok({ alt: undefined })).toBe(false);
    expect(ok({ alt: 42 })).toBe(false);
    expect(ok({ alt: "x".repeat(301) })).toBe(false);
  });
});

// El ancho acaba en un `width: N%` del atributo style de la pagina publicada, asi
// que no vale «lo que venga». Fuera de rango o con decimales se rechaza ENTERO en
// vez de recortarse: recortar en silencio deja al usuario con un resultado que no
// pidio y sin saber por que.
describe("isValidOp · tamano y margen (numeros)", () => {
  const size = (v: unknown) => isValidOp({ page: "i", nodeId: 0, kind: "size", value: v } as never);
  const margen = (v: unknown) => isValidOp({ page: "i", nodeId: 0, kind: "margen", value: v } as never);

  it("acepta enteros dentro de rango", () => {
    expect(size(10)).toBe(true);
    expect(size(37)).toBe(true);
    expect(size(100)).toBe(true);
    expect(margen(0)).toBe(true);
    expect(margen(120)).toBe(true);
  });

  it("rechaza fuera de rango", () => {
    expect(size(9)).toBe(false);
    expect(size(101)).toBe(false);
    expect(size(0)).toBe(false);
    expect(size(-20)).toBe(false);
    expect(margen(-1)).toBe(false);
    expect(margen(121)).toBe(false);
  });

  it("rechaza decimales, texto y basura", () => {
    for (const v of [12.5, "50", "50%", "", null, undefined, NaN, Infinity, {}, []]) {
      expect(size(v), String(v)).toBe(false);
      expect(margen(v), String(v)).toBe(false);
    }
  });
});
