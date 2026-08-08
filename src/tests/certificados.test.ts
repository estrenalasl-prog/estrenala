import { describe, it, expect } from "vitest";
import { diasHasta, tocaAvisar, correoAviso, UMBRALES } from "@/src/certificados/aviso";
import { revisarCertificados, type Deps } from "@/src/certificados/revisar";
import type { Correo } from "@/src/email/enviar";

const AHORA = new Date("2026-08-08T12:00:00Z");
const enDias = (n: number) => new Date(AHORA.getTime() + n * 86_400_000);

describe("cuántos días quedan", () => {
  it("cuenta días enteros, no fracciones", () => {
    expect(diasHasta(enDias(15), AHORA)).toBe(15);
    expect(diasHasta(new Date("2026-08-09T23:00:00Z"), AHORA)).toBe(1);
  });

  it("un certificado ya caducado da negativo", () => {
    expect(diasHasta(enDias(-3), AHORA)).toBe(-3);
  });

  /** Quedan horas: es hoy, no mañana. Redondear hacia arriba sería mentir. */
  it("las últimas horas cuentan como cero, no como uno", () => {
    expect(diasHasta(new Date("2026-08-08T23:00:00Z"), AHORA)).toBe(0);
  });
});

describe("cuándo se avisa", () => {
  /**
   * Traefik renueva a los 30 días restantes. Avisar ahí sería avisar de que todo
   * va bien, y un aviso que casi siempre es falso deja de leerse.
   */
  it("NO se avisa mientras la renovación automática debería estar haciendo su trabajo", () => {
    for (const d of [89, 60, 45, 31, 30, 25, 20, 16]) {
      expect(tocaAvisar(d), `${d} días`).toBe(false);
    }
  });

  it("se avisa en los cuatro umbrales", () => {
    for (const d of UMBRALES) expect(tocaAvisar(d), `${d} días`).toBe(true);
  });

  /** Entre umbral y umbral se calla: cuatro correos en dos semanas, no quince. */
  it("entre umbrales no repite", () => {
    for (const d of [14, 13, 12, 11, 10, 9, 8, 6, 5, 4, 2]) {
      expect(tocaAvisar(d), `${d} días`).toBe(false);
    }
  });

  it("caducado avisa TODOS los días: la web está rota", () => {
    for (const d of [0, -1, -2, -30]) expect(tocaAvisar(d), `${d} días`).toBe(true);
  });
});

describe("el correo que le llega al dueño", () => {
  const base = { dominio: "sucafeteria.com", proyecto: "La Cafetería", email: "ana@sucafeteria.com" };

  it("dice cuántos días quedan y la fecha, en cristiano", () => {
    const c = correoAviso({ ...base, caduca: new Date("2026-08-23T10:00:00Z") }, 15);
    expect(c.asunto).toBe("El certificado de sucafeteria.com caduca en 15 días (el 23 de agosto de 2026)");
    expect(c.texto).toContain("23 de agosto de 2026");
  });

  it("«mañana» se dice mañana, no «en 1 días»", () => {
    expect(correoAviso({ ...base, caduca: enDias(1) }, 1).asunto)
      .toBe("El certificado de sucafeteria.com caduca mañana");
  });

  /** Ya roto: el asunto tiene que decir la consecuencia, no la causa. */
  it("caducado, el asunto habla de la web, no del certificado", () => {
    const c = correoAviso({ ...base, caduca: enDias(-2) }, -2);
    expect(c.asunto).toBe("Tu web sucafeteria.com no se ve: su certificado ha caducado");
    expect(c.html).toContain("aviso de seguridad");
  });

  /**
   * Quien recibe esto no puede hacer nada: la renovación es cosa nuestra. Un
   * aviso que asusta sin decir quién se encarga es peor que no avisar.
   */
  it("deja claro que él no tiene que hacer nada", () => {
    const c = correoAviso({ ...base, caduca: enDias(7) }, 7);
    expect(c.html).toContain("No tienes que hacer nada");
    expect(c.texto).toContain("No tienes que hacer nada");
  });

  it("el texto plano no arrastra etiquetas HTML", () => {
    const c = correoAviso({ ...base, caduca: enDias(3) }, 3);
    expect(c.texto).not.toMatch(/<[a-z/]/i);
  });
});

// ── La revisión completa ────────────────────────────────────────────────
function montar(
  dominios: { dominio: string; proyecto: string; email: string }[],
  caducidades: Record<string, Date | null | "revienta">
) {
  const enviados: Correo[] = [];
  const deps: Deps = {
    listar: async () => dominios,
    caducidad: async (h) => {
      const v = caducidades[h];
      if (v === "revienta") throw new Error("ECONNREFUSED");
      return v ?? null;
    },
    enviar: async (c) => { enviados.push(c); },
  };
  return { deps, enviados };
}

const UNO = { dominio: "sucafeteria.com", proyecto: "La Cafetería", email: "ana@sucafeteria.com" };
const OTRO = { dominio: "tallernogal.es", proyecto: "Taller Nogal", email: "luis@tallernogal.es" };

describe("la revisión diaria", () => {
  it("con todo en orden no escribe a nadie", async () => {
    const { deps, enviados } = montar([UNO], { "sucafeteria.com": enDias(60) });
    const r = await revisarCertificados(deps, AHORA);
    expect(r).toMatchObject({ revisados: 1, avisados: 0, ilegibles: [] });
    expect(enviados).toEqual([]);
  });

  it("avisa al dueño, y solo a él, cuando toca", async () => {
    const { deps, enviados } = montar([UNO], { "sucafeteria.com": enDias(7) });
    await revisarCertificados(deps, AHORA);
    expect(enviados).toHaveLength(1);
    expect(enviados[0].para).toBe("ana@sucafeteria.com");
  });

  it("avisa a cada dueño del suyo, sin mezclarlos", async () => {
    const { deps, enviados } = montar([UNO, OTRO], {
      "sucafeteria.com": enDias(3), "tallernogal.es": enDias(50),
    });
    await revisarCertificados(deps, AHORA);
    expect(enviados.map((e) => e.para)).toEqual(["ana@sucafeteria.com"]);
    expect(enviados[0].asunto).toContain("sucafeteria.com");
  });

  /**
   * Un corte de red de diez segundos avisaría a TODOS los clientes de que su web
   * se rompe. No poder leerlo no es lo mismo que estar a punto de caducar.
   */
  it("si no puede leer el certificado NO manda nada: lo anota", async () => {
    const { deps, enviados } = montar([UNO, OTRO], {
      "sucafeteria.com": "revienta", "tallernogal.es": null,
    });
    const r = await revisarCertificados(deps, AHORA);
    expect(enviados).toEqual([]);
    expect(r.ilegibles.sort()).toEqual(["sucafeteria.com", "tallernogal.es"]);
    expect(r.avisados).toBe(0);
  });

  it("un dominio que revienta no impide revisar los demás", async () => {
    const { deps, enviados } = montar([UNO, OTRO], {
      "sucafeteria.com": "revienta", "tallernogal.es": enDias(1),
    });
    const r = await revisarCertificados(deps, AHORA);
    expect(r.revisados).toBe(2);
    expect(enviados.map((e) => e.para)).toEqual(["luis@tallernogal.es"]);
  });

  it("apunta los días de todos, aunque no haya nada que avisar", async () => {
    const { deps } = montar([UNO, OTRO], {
      "sucafeteria.com": enDias(60), "tallernogal.es": enDias(31),
    });
    const r = await revisarCertificados(deps, AHORA);
    expect(r.dias).toEqual({ "sucafeteria.com": 60, "tallernogal.es": 31 });
  });

  describe("la copia al operador", () => {
    it("recibe su propia copia, identificando a quién se avisó", async () => {
      const { deps, enviados } = montar([UNO], { "sucafeteria.com": enDias(3) });
      await revisarCertificados({ ...deps, copiaA: "sebas@estrenala.com" }, AHORA);
      expect(enviados).toHaveLength(2);
      expect(enviados[1].para).toBe("sebas@estrenala.com");
      expect(enviados[1].texto).toContain("ana@sucafeteria.com");
      expect(enviados[1].texto).toContain("La Cafetería");
    });

    /** En el correo del cliente no tiene por qué aparecer nadie más. */
    it("el correo del dueño NO menciona al operador", async () => {
      const { deps, enviados } = montar([UNO], { "sucafeteria.com": enDias(3) });
      await revisarCertificados({ ...deps, copiaA: "sebas@estrenala.com" }, AHORA);
      expect(enviados[0].html).not.toContain("sebas@estrenala.com");
    });

    it("si el dueño ES el operador, no se duplica el correo", async () => {
      const mio = { ...UNO, email: "sebas@estrenala.com" };
      const { deps, enviados } = montar([mio], { "sucafeteria.com": enDias(1) });
      await revisarCertificados({ ...deps, copiaA: "sebas@estrenala.com" }, AHORA);
      expect(enviados).toHaveLength(1);
    });

    it("sin operador configurado, solo va el del dueño", async () => {
      const { deps, enviados } = montar([UNO], { "sucafeteria.com": enDias(1) });
      await revisarCertificados(deps, AHORA);
      expect(enviados).toHaveLength(1);
    });
  });

  it("sin dominios propios conectados, no hace nada y no falla", async () => {
    const { deps, enviados } = montar([], {});
    const r = await revisarCertificados(deps, AHORA);
    expect(r).toEqual({ revisados: 0, avisados: 0, ilegibles: [], dias: {} });
    expect(enviados).toEqual([]);
  });
});
