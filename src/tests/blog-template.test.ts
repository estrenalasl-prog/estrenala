import { describe, it, expect } from "vitest";
import { renderTemplate, huecosSinRellenar } from "@/src/blog/template";

describe("renderTemplate", () => {
  it("sustituye placeholders {{clave}}", () => {
    expect(renderTemplate("<h1>{{titulo}}</h1><p>{{ meta_descripcion }}</p>", {
      titulo: "Hola", meta_descripcion: "Desc",
    })).toBe("<h1>Hola</h1><p>Desc</p>");
  });
  it("deja intactos los placeholders sin valor", () => {
    expect(renderTemplate("<p>{{desconocido}}</p>", {})).toBe("<p>{{desconocido}}</p>");
  });
});

describe("huecosSinRellenar", () => {
  it("detecta los placeholders restantes", () => {
    expect(huecosSinRellenar("<h1>Hola</h1><p>{{imagen}} y {{fecha}}</p>")).toEqual(["imagen", "fecha"]);
  });
  it("devuelve vacío si no quedan huecos", () => {
    expect(huecosSinRellenar("<h1>Hola</h1>")).toEqual([]);
  });
});
