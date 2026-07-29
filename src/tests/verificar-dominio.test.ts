import { describe, it, expect } from "vitest";
import {
  verificarDominio, tokenDominio, registroTxtEsperado, PREFIJO_TXT, SUBDOMINIO_TXT,
  type Resolutor,
} from "@/src/publish/verificar-dominio";

const IP = "72.61.176.214";
const SECRETO = "clave-maestra-de-pruebas";
const DOM = "sucafeteria.com";

// Resolutor de mentira: se le dice qué contesta cada nombre. Lo que no esté
// declarado lanza, que es como se comporta el DNS de verdad ante un NXDOMAIN.
function dns(mapa: { a?: Record<string, string[]>; txt?: Record<string, string[][]> }): Resolutor {
  return {
    async resolve4(host) {
      const r = mapa.a?.[host];
      if (!r) throw Object.assign(new Error("ENOTFOUND"), { code: "ENOTFOUND" });
      return r;
    },
    async resolveTxt(host) {
      const r = mapa.txt?.[host];
      if (!r) throw Object.assign(new Error("ENODATA"), { code: "ENODATA" });
      return r;
    },
  };
}

const token = tokenDominio(DOM, SECRETO);

describe("tokenDominio", () => {
  it("es estable: el mismo dominio da siempre el mismo token", () => {
    expect(tokenDominio(DOM, SECRETO)).toBe(token);
  });

  it("no depende de mayúsculas ni espacios", () => {
    expect(tokenDominio("  SuCafeteria.COM ", SECRETO)).toBe(token);
  });

  it("cambia con el dominio y con la clave maestra", () => {
    expect(tokenDominio("otra.com", SECRETO)).not.toBe(token);
    expect(tokenDominio(DOM, "otra-clave")).not.toBe(token);
  });

  it("no deja escapar la clave maestra", () => {
    expect(token).not.toContain(SECRETO);
    expect(token).toMatch(/^[0-9a-f]{32}$/);
  });
});

describe("verificarDominio", () => {
  it("vale con que el dominio apunte a nuestra IP (el caso normal)", async () => {
    const r = await verificarDominio(dns({ a: { [DOM]: [IP] } }), { dominio: DOM, ipDestino: IP, secreto: SECRETO });
    expect(r).toEqual({ ok: true, via: "a" });
  });

  it("vale aunque tenga varias IP y la nuestra sea una más", async () => {
    const r = await verificarDominio(dns({ a: { [DOM]: ["1.2.3.4", IP] } }), { dominio: DOM, ipDestino: IP, secreto: SECRETO });
    expect(r.ok).toBe(true);
  });

  it("con el dominio detrás de un proxy, el TXT lo salva", async () => {
    // Cloudflare en naranja: el registro A resuelve al proxy, nunca a nosotros.
    const r = await verificarDominio(
      dns({
        a: { [DOM]: ["104.21.0.1", "172.67.0.1"] },
        txt: { [`${SUBDOMINIO_TXT}.${DOM}`]: [[PREFIJO_TXT + token]] },
      }),
      { dominio: DOM, ipDestino: IP, secreto: SECRETO }
    );
    expect(r).toEqual({ ok: true, via: "txt" });
  });

  it("junta los trozos de un TXT largo antes de compararlo", async () => {
    const partido = [PREFIJO_TXT.slice(0, 5), PREFIJO_TXT.slice(5) + token];
    const r = await verificarDominio(
      dns({ txt: { [`${SUBDOMINIO_TXT}.${DOM}`]: [partido] } }),
      { dominio: DOM, ipDestino: IP, secreto: SECRETO }
    );
    expect(r.ok).toBe(true);
  });

  it("un dominio ajeno NO se puede conectar: es de lo que va todo esto", async () => {
    const r = await verificarDominio(
      dns({ a: { "elcorteingles.es": ["1.2.3.4"] } }),
      { dominio: "elcorteingles.es", ipDestino: IP, secreto: SECRETO }
    );
    expect(r).toEqual({ ok: false, motivo: "no-apunta", apuntaA: ["1.2.3.4"] });
  });

  it("un dominio que no existe es «todavía no», no un error", async () => {
    const r = await verificarDominio(dns({}), { dominio: DOM, ipDestino: IP, secreto: SECRETO });
    expect(r).toEqual({ ok: false, motivo: "no-apunta", apuntaA: [] });
  });

  it("un TXT con otro token no cuela", async () => {
    const r = await verificarDominio(
      dns({ txt: { [`${SUBDOMINIO_TXT}.${DOM}`]: [[PREFIJO_TXT + "0".repeat(32)]] } }),
      { dominio: DOM, ipDestino: IP, secreto: SECRETO }
    );
    expect(r.ok).toBe(false);
  });

  it("el token de OTRO dominio tampoco sirve para este", async () => {
    const r = await verificarDominio(
      dns({ txt: { [`${SUBDOMINIO_TXT}.${DOM}`]: [[PREFIJO_TXT + tokenDominio("otra.com", SECRETO)]] } }),
      { dominio: DOM, ipDestino: IP, secreto: SECRETO }
    );
    expect(r.ok).toBe(false);
  });
});

describe("registroTxtEsperado", () => {
  it("dice exactamente qué registro poner", () => {
    expect(registroTxtEsperado(DOM, SECRETO)).toEqual({
      nombre: `_estrenala.${DOM}`,
      valor: `estrenala-verificacion=${token}`,
    });
  });
});
