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

describe("isValidOp · las herramientas de bloque", () => {
  const base = { page: "index.html", nodeId: 0 };

  it("la alineación del texto admite las tres, y solo las tres", () => {
    for (const value of ["izquierda", "centro", "derecha"] as const) {
      expect(isValidOp({ ...base, kind: "textAlign", value })).toBe(true);
    }
    // CSS crudo NO: el cliente manda la intención y el servidor decide el CSS.
    // Si aquí entrara una cadena libre, entraría en el atributo `style` de la
    // página publicada de un cliente.
    for (const value of ["left", "center", "justify", "red; color: red", ""]) {
      expect(isValidOp({ ...base, kind: "textAlign", value } as never), value).toBe(false);
    }
  });

  it("el recuadro admite los cuatro nombres, y solo esos", () => {
    for (const value of ["ninguno", "suave", "borde", "lateral"] as const) {
      expect(isValidOp({ ...base, kind: "recuadro", value })).toBe(true);
    }
    for (const value of ["azul", "", "padding: 40px"]) {
      expect(isValidOp({ ...base, kind: "recuadro", value } as never), value).toBe(false);
    }
  });

  // `Object.hasOwn` y no una búsqueda directa: con `RECUADROS["constructor"]`
  // saldría la función Object —que es «truthy»— y un recuadro llamado así
  // pasaría la validación. Es el mismo fallo que ya mordió en contentTypeFor.
  it("«constructor» y «toString» no se cuelan como recuadros", () => {
    for (const value of ["constructor", "toString", "__proto__"]) {
      expect(isValidOp({ ...base, kind: "recuadro", value } as never), value).toBe(false);
    }
  });

  it("el lado del margen admite los tres, o ninguno", () => {
    expect(isValidOp({ ...base, kind: "margen", value: 20 })).toBe(true);
    for (const lado of ["ambos", "arriba", "abajo"] as const) {
      expect(isValidOp({ ...base, kind: "margen", value: 20, lado })).toBe(true);
    }
    expect(isValidOp({ ...base, kind: "margen", value: 20, lado: "izquierda" } as never)).toBe(false);
    // Y el rango sigue mandando aunque el lado sea bueno.
    expect(isValidOp({ ...base, kind: "margen", value: 500, lado: "arriba" })).toBe(false);
  });
});

describe("isValidOp · el tamaño de la letra", () => {
  const base = { page: "index.html", nodeId: 0 };

  it("acepta píxeles enteros dentro del rango", () => {
    for (const value of [10, 16, 34, 96]) {
      expect(isValidOp({ ...base, kind: "fontSize", value })).toBe(true);
    }
  });

  // Fuera de rango se RECHAZA entera en vez de recortarse: recortar convierte un
  // error en una sorpresa silenciosa, y esto acaba en el `style` de una página
  // publicada.
  it("rechaza lo que no es un entero en rango", () => {
    for (const value of [9, 97, 0, -20, 16.5, NaN, Infinity]) {
      expect(isValidOp({ ...base, kind: "fontSize", value }), String(value)).toBe(false);
    }
    expect(isValidOp({ ...base, kind: "fontSize", value: "34px" } as never)).toBe(false);
  });
});

describe("isValidOp · mover", () => {
  const base = { page: "index.html", nodeId: 0 };

  it("acepta desplazamientos con signo", () => {
    for (const value of [-50, -2, -1, 1, 3, 50]) {
      expect(isValidOp({ ...base, kind: "mover", value }), String(value)).toBe(true);
    }
  });

  // El cero no mueve nada. Dejarlo pasar crearía una versión en el historial sin
  // ninguna diferencia y el panel diría un cambio de más.
  it("el cero no es un movimiento", () => {
    expect(isValidOp({ ...base, kind: "mover", value: 0 })).toBe(false);
  });

  it("rechaza lo que no es un entero en rango", () => {
    for (const value of [51, -51, 1.5, NaN, Infinity]) {
      expect(isValidOp({ ...base, kind: "mover", value }), String(value)).toBe(false);
    }
    expect(isValidOp({ ...base, kind: "mover", value: "-1" } as never)).toBe(false);
  });
});
