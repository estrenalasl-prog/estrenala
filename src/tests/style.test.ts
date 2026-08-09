import { describe, it, expect } from "vitest";
import { mergeStyleProperty, quitarStyleProperty } from "@/src/editor/style";

describe("mergeStyleProperty", () => {
  it("añade la propiedad cuando no había style", () => {
    expect(mergeStyleProperty("", "color", "red")).toBe("color: red");
  });

  it("añade la propiedad conservando las existentes", () => {
    expect(mergeStyleProperty("font-weight: bold", "color", "red"))
      .toBe("font-weight: bold; color: red");
  });

  it("reemplaza el valor si la propiedad ya existe", () => {
    expect(mergeStyleProperty("color: blue; margin: 0", "color", "red"))
      .toBe("color: red; margin: 0");
  });

  it("reemplaza de forma case-insensitive en el nombre", () => {
    expect(mergeStyleProperty("COLOR: blue", "color", "red")).toBe("color: red");
  });

  it("ignora declaraciones vacías o sin ':'", () => {
    expect(mergeStyleProperty("color: blue;; foo", "color", "red")).toBe("color: red");
  });
});

describe("quitarStyleProperty", () => {
  it("quita la propiedad y conserva el resto en su orden", () => {
    expect(quitarStyleProperty("color: red; padding: 8px; margin: 0", "padding"))
      .toBe("color: red; margin: 0");
  });

  it("no distingue mayúsculas en el nombre", () => {
    expect(quitarStyleProperty("PADDING: 8px; color: red", "padding")).toBe("color: red");
  });

  it("quitar lo que no está deja la cadena como estaba", () => {
    expect(quitarStyleProperty("color: red", "padding")).toBe("color: red");
  });

  // El caso de «sin recuadro» sobre un elemento que solo tenía el recuadro:
  // tiene que quedar vacío, no «; ;».
  it("quitar la única propiedad deja la cadena vacía", () => {
    expect(quitarStyleProperty("padding: 8px", "padding")).toBe("");
  });

  // Quitar `padding` NO puede llevarse `padding-left`: son propiedades distintas
  // y cada una se borra por su nombre (por eso el grupo del recuadro las lista
  // todas, abreviadas y largas).
  it("no confunde la abreviada con la larga", () => {
    expect(quitarStyleProperty("padding: 8px; padding-left: 2px", "padding"))
      .toBe("padding-left: 2px");
  });
});
