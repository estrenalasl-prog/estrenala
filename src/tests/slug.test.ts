import { describe, it, expect } from "vitest";
import { slugify, formatoSlugValido, esReservado, esSlugValido } from "@/src/publish/slug";

describe("slugify", () => {
  it("minúsculas, sin acentos, espacios → guiones", () => {
    expect(slugify("Cafetería Aurora")).toBe("cafeteria-aurora");
  });
  it("símbolos → guion, colapsa y recorta guiones", () => {
    expect(slugify("  ¡Mi   Web! (2026) ")).toBe("mi-web-2026");
  });
  it("trunca a 63 sin dejar guion final", () => {
    const s = slugify("a".repeat(80));
    expect(s.length).toBeLessThanOrEqual(63);
    expect(s.endsWith("-")).toBe(false);
  });
  it("vacío o solo símbolos → 'sitio'", () => {
    expect(slugify("!!!")).toBe("sitio");
    expect(slugify("")).toBe("sitio");
  });
});

describe("formatoSlugValido", () => {
  it("acepta etiquetas DNS válidas", () => {
    for (const s of ["a", "a1", "mi-web", "x".repeat(63)]) expect(formatoSlugValido(s)).toBe(true);
  });
  it("rechaza mayúsculas, guiones extremos, vacío, >63, caracteres raros", () => {
    for (const s of ["", "A", "-a", "a-", "mi web", "a.b", "x".repeat(64)]) expect(formatoSlugValido(s)).toBe(false);
  });
});

describe("esReservado / esSlugValido", () => {
  it("www y sites están reservados", () => {
    expect(esReservado("www")).toBe(true);
    expect(esReservado("sites")).toBe(true);
    expect(esReservado("cafeteria")).toBe(false);
  });
  // `send.estrenala.com` lleva el SPF y el MX de Resend, y `analitica` es donde va
  // Umami. Que un cliente pudiera pedirlos sería su web peleándose con nuestra
  // propia infraestructura en el mismo nombre.
  it("los subdominios de nuestra infraestructura tampoco se pueden pedir", () => {
    expect(esReservado("send")).toBe(true);
    expect(esReservado("analitica")).toBe(true);
    expect(esReservado("panel")).toBe(true);
  });
  it("esSlugValido = formato ok y no reservado", () => {
    expect(esSlugValido("cafeteria-aurora")).toBe(true);
    expect(esSlugValido("www")).toBe(false);
    expect(esSlugValido("Mi Web")).toBe(false);
  });
});
