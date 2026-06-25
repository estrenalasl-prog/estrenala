import { describe, it, expect } from "vitest";
import { detectarEntrada } from "@/src/import/entry";
import { ImportError } from "@/src/import/unzip";

describe("detectarEntrada", () => {
  it("prefiere index.html menos profundo", () => {
    expect(detectarEntrada(["a/index.html", "index.html", "x.html"])).toBe("index.html");
  });
  it("si no hay index.html, el .html menos profundo", () => {
    expect(detectarEntrada(["sub/a.html", "home.html"])).toBe("home.html");
  });
  it("sin ningún html lanza ImportError", () => {
    expect(() => detectarEntrada(["css/app.css", "img/x.png"])).toThrow(ImportError);
  });
});
