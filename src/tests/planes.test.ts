import { describe, it, expect } from "vitest";
import {
  PLANES, ORDEN, PLANES_CON_BLOG, planDe, limitesDe, puede, alcanzoLimiteWebs, exigirCapacidad, exigirHuecoDeWeb,
  msgLimiteWebs, MSG_DOMINIO_PLAN, MSG_BLOG_PLAN, MSG_EQUIPO_PLAN,
} from "@/src/planes/planes";
import { EditorError } from "@/src/editor/errors";

describe("planDe — ante la duda, el plan que menos concede", () => {
  it("reconoce los planes válidos", () => {
    expect(planDe("free")).toBe("free");
    expect(planDe("personal")).toBe("personal");
    expect(planDe("agencia")).toBe("agencia");
  });

  it("cualquier cosa rara cae a free", () => {
    for (const v of ["", "premium", "AGENCIA", null, undefined, 7, {}]) {
      expect(planDe(v)).toBe("free");
    }
  });
});

describe("capacidades por plan", () => {
  it("gratis: solo publicar y editar", () => {
    expect(puede("free", "dominioPropio")).toBe(false);
    expect(puede("free", "blog")).toBe(false);
    expect(puede("free", "equipo")).toBe(false);
    expect(puede("free", "sinMarca")).toBe(false);
  });

  it("personal: dominio propio, blog y sin marca; equipo NO", () => {
    expect(puede("personal", "dominioPropio")).toBe(true);
    expect(puede("personal", "blog")).toBe(true);
    expect(puede("personal", "sinMarca")).toBe(true);
    expect(puede("personal", "equipo")).toBe(false);
  });

  it("agencia: todo, incluido equipo", () => {
    for (const c of ["dominioPropio", "blog", "equipo", "sinMarca"] as const) {
      expect(puede("agencia", c)).toBe(true);
    }
  });

  it("los precios son los acordados (9 y 29, con 2 meses gratis al año)", () => {
    expect(PLANES.free.precioMes).toBe(0);
    expect(PLANES.personal.precioMes).toBe(9);
    expect(PLANES.personal.precioAnual).toBe(90);
    expect(PLANES.agencia.precioMes).toBe(29);
    expect(PLANES.agencia.precioAnual).toBe(290);
  });

  it("los límites de webs son 1 / 3 / 25", () => {
    expect(limitesDe("free").webs).toBe(1);
    expect(limitesDe("personal").webs).toBe(3);
    expect(limitesDe("agencia").webs).toBe(25);
  });
});

describe("límite de webs", () => {
  it("gratis: la primera cabe, la segunda no", () => {
    expect(alcanzoLimiteWebs("free", 0)).toBe(false);
    expect(alcanzoLimiteWebs("free", 1)).toBe(true);
  });

  it("personal: caben 3", () => {
    expect(alcanzoLimiteWebs("personal", 2)).toBe(false);
    expect(alcanzoLimiteWebs("personal", 3)).toBe(true);
  });

  it("mensaje en singular para 1 web y en plural para varias", () => {
    expect(msgLimiteWebs("free")).toBe("Tu plan incluye 1 web. Mejora de plan para publicar más.");
    expect(msgLimiteWebs("personal")).toBe("Tu plan incluye 3 webs. Mejora de plan para publicar más.");
  });
});

describe("exigir… lanza 402 (falta plan), no 403 (falta permiso)", () => {
  it("exigirHuecoDeWeb corta al llegar al límite", () => {
    expect(() => exigirHuecoDeWeb("free", 0)).not.toThrow();
    try {
      exigirHuecoDeWeb("free", 1);
      throw new Error("debería haber lanzado");
    } catch (e) {
      expect(e).toBeInstanceOf(EditorError);
      expect((e as EditorError).status).toBe(402);
      expect((e as EditorError).message).toBe("Tu plan incluye 1 web. Mejora de plan para publicar más.");
    }
  });

  it("exigirCapacidad usa el mensaje exacto de cada capacidad", () => {
    expect(() => exigirCapacidad("free", "dominioPropio")).toThrowError(MSG_DOMINIO_PLAN);
    expect(() => exigirCapacidad("free", "blog")).toThrowError(MSG_BLOG_PLAN);
    expect(() => exigirCapacidad("personal", "equipo")).toThrowError(MSG_EQUIPO_PLAN);
  });

  it("no lanza cuando el plan sí incluye la capacidad", () => {
    expect(() => exigirCapacidad("personal", "dominioPropio")).not.toThrow();
    expect(() => exigirCapacidad("agencia", "equipo")).not.toThrow();
  });
});

describe("PLANES_CON_BLOG", () => {
  it("sale de PLANES, así que no puede quedarse desfasado", () => {
    expect(PLANES_CON_BLOG).toEqual(ORDEN.filter((p) => PLANES[p].blog));
  });

  it("el gratuito nunca entra (lo usa el cron del piloto)", () => {
    expect(PLANES_CON_BLOG).not.toContain("free");
    expect(PLANES_CON_BLOG.length).toBeGreaterThan(0);
  });
});
