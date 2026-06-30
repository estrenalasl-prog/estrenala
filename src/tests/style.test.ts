import { describe, it, expect } from "vitest";
import { mergeStyleProperty } from "@/src/editor/style";

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
