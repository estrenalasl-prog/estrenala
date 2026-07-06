import { describe, it, expect } from "vitest";
import { slugify, slugUnico } from "@/src/blog/slug";

describe("slugify", () => {
  it("convierte a minúsculas con guiones", () => {
    expect(slugify("Agentes IA para Pymes")).toBe("agentes-ia-para-pymes");
  });
  it("quita acentos y eñes", () => {
    expect(slugify("Automatización en España")).toBe("automatizacion-en-espana");
  });
  it("elimina signos y limita a 5 palabras", () => {
    expect(slugify("¿Qué es un agente de IA? ¡Guía completa 2026!", 5)).toBe("que-es-un-agente-de");
  });
  it("colapsa espacios y guiones repetidos", () => {
    expect(slugify("hola   -- mundo")).toBe("hola-mundo");
  });
  it("devuelve cadena vacía para texto sin caracteres válidos", () => {
    expect(slugify("??? ---!!!")).toBe("");
  });
});

describe("slugUnico", () => {
  it("devuelve el slug si no existe", () => {
    expect(slugUnico("hola", ["otro"])).toBe("hola");
  });
  it("sufija -2, -3... si ya existe", () => {
    expect(slugUnico("hola", ["hola"])).toBe("hola-2");
    expect(slugUnico("hola", ["hola", "hola-2"])).toBe("hola-3");
  });
});
