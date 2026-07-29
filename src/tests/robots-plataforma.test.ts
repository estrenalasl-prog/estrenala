import { describe, it, expect } from "vitest";
import { plataformaOculta, reglasRobots, ZONAS_PRIVADAS, ROBOTS_NOINDEX } from "@/src/config/robots-plataforma";

const env = (v?: string) => ({ PLATAFORMA_NOINDEX: v });

describe("plataformaOculta", () => {
  it("sin variable, la plataforma está abierta (es lo normal en producción)", () => {
    expect(plataformaOculta(env())).toBe(false);
    expect(plataformaOculta(env(""))).toBe(false);
  });

  it("acepta las formas que uno escribe sin pensar", () => {
    for (const v of ["1", "true", "TRUE", " si ", "sí"]) {
      expect(plataformaOculta(env(v))).toBe(true);
    }
  });

  it("cualquier otra cosa NO oculta: apagar es lo seguro solo si es explícito", () => {
    for (const v of ["0", "false", "no", "quizá"]) {
      expect(plataformaOculta(env(v))).toBe(false);
    }
  });
});

describe("reglasRobots", () => {
  it("oculta: nadie rastrea nada", () => {
    expect(reglasRobots(true)).toEqual({ rules: { userAgent: "*", disallow: "/" } });
  });

  it("abierta: se rastrea todo menos las zonas privadas", () => {
    const r = reglasRobots(false);
    expect(r.rules.allow).toBe("/");
    expect(r.rules.disallow).toEqual(ZONAS_PRIVADAS);
  });

  it("el panel, la API y el papeleo de cuenta siempre quedan fuera", () => {
    for (const zona of ["/api/", "/projects/", "/settings", "/login", "/registro"]) {
      expect(ZONAS_PRIVADAS).toContain(zona);
    }
  });

  it("las páginas que sí queremos en Google no están vetadas", () => {
    for (const publica of ["/", "/legal/privacidad", "/brand"]) {
      expect(ZONAS_PRIVADAS.some((z) => publica.startsWith(z))).toBe(false);
    }
  });
});

describe("ROBOTS_NOINDEX", () => {
  it("es el valor literal que espera Google", () => {
    expect(ROBOTS_NOINDEX).toBe("noindex, nofollow");
  });
});
