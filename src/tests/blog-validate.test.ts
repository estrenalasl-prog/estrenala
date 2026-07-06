import { describe, it, expect } from "vitest";
import { validarPrePublicacion } from "@/src/blog/validate";

const OK = {
  titulo: "Un título",
  slug: "un-titulo",
  slugsExistentes: ["otro-post"],
  metaDescripcion: "Una meta descripción correcta.",
  imagenPath: "data/uploads/post-1.webp",
  htmlFinal: "<html><body><h1>Un título</h1></body></html>",
};

describe("validarPrePublicacion", () => {
  it("devuelve [] cuando todo está bien", () => {
    expect(validarPrePublicacion(OK)).toEqual([]);
  });
  it("detecta título, slug, meta e imagen ausentes", () => {
    const errores = validarPrePublicacion({ ...OK, titulo: null, slug: null, metaDescripcion: null, imagenPath: null });
    expect(errores).toHaveLength(4);
  });
  it("rechaza slug con mayúsculas o espacios", () => {
    expect(validarPrePublicacion({ ...OK, slug: "Con Espacios" })).toHaveLength(1);
  });
  it("rechaza slug duplicado en el sitio", () => {
    expect(validarPrePublicacion({ ...OK, slug: "otro-post" })[0]).toMatch(/ya existe/);
  });
  it("rechaza meta descripción de más de 160 caracteres", () => {
    expect(validarPrePublicacion({ ...OK, metaDescripcion: "x".repeat(161) })[0]).toMatch(/160/);
  });
  it("detecta huecos {{}} sin rellenar en el HTML final", () => {
    expect(validarPrePublicacion({ ...OK, htmlFinal: "<p>{{imagen}}</p>" })[0]).toMatch(/imagen/);
  });
});
