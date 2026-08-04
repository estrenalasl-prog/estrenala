import { describe, it, expect } from "vitest";
import {
  verificarDominio, tokenDominio, registroTxtEsperado, proveedorDeNs,
  PREFIJO_TXT, SUBDOMINIO_TXT, type Resolutor,
} from "@/src/publish/verificar-dominio";

const IP = "72.61.176.214";
const SECRETO = "clave-maestra-de-pruebas";
const DOM = "sucafeteria.com";

type Mapa = {
  a?: Record<string, string[]>;
  txt?: Record<string, string[][]>;
  aaaa?: Record<string, string[]>;
  ns?: Record<string, string[]>;
};

// Resolutor de mentira: se le dice qué contesta cada nombre. Lo que no esté
// declarado lanza, que es como se comporta el DNS de verdad ante un NXDOMAIN.
function dns(mapa: Mapa): Resolutor {
  const responde = (tabla: Record<string, string[]> | undefined, host: string) => {
    const r = tabla?.[host];
    if (!r) throw Object.assign(new Error("ENOTFOUND"), { code: "ENOTFOUND" });
    return Promise.resolve(r);
  };
  return {
    resolve4: (host) => responde(mapa.a, host),
    resolve6: (host) => responde(mapa.aaaa, host),
    resolveNs: (host) => responde(mapa.ns, host),
    async resolveTxt(host) {
      const r = mapa.txt?.[host];
      if (!r) throw Object.assign(new Error("ENODATA"), { code: "ENODATA" });
      return r;
    },
  };
}

/** El caso feliz de un dominio pelado: A y www puestos, sin AAAA. */
const bien = (extra: Mapa = {}): Mapa => ({
  a: { [DOM]: [IP], [`www.${DOM}`]: [IP] },
  ...extra,
});

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
    const r = await verificarDominio(dns(bien()), { dominio: DOM, ipDestino: IP, secreto: SECRETO });
    expect(r).toEqual({ ok: true, via: "a", apuntaA: [IP], estorbos: [], proveedor: null });
  });

  it("vale aunque tenga varias IP y la nuestra sea una más", async () => {
    const r = await verificarDominio(
      dns({ a: { [DOM]: ["1.2.3.4", IP], [`www.${DOM}`]: [IP] } }),
      { dominio: DOM, ipDestino: IP, secreto: SECRETO }
    );
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
    expect(r).toMatchObject({ ok: true, via: "txt" });
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
    expect(r).toEqual({ ok: false, motivo: "no-apunta", apuntaA: ["1.2.3.4"], estorbos: [], proveedor: null });
  });

  it("un dominio que no existe es «todavía no», no un error", async () => {
    const r = await verificarDominio(dns({}), { dominio: DOM, ipDestino: IP, secreto: SECRETO });
    expect(r).toEqual({ ok: false, motivo: "no-apunta", apuntaA: [], estorbos: [], proveedor: null });
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

/**
 * El fallo más silencioso de mudar un dominio: el registro A está bien puesto,
 * así que el dueño lo mira y lo ve correcto — pero los navegadores prefieren
 * IPv6, y siguen yendo al hosting anterior. Ve su web nueva desde un sitio y la
 * vieja desde otro, sin ninguna explicación posible.
 */
describe("registros AAAA que se quedaron del hosting anterior", () => {
  const V6_AJENO = "2a02:4780:2a:9065::1";

  it("con el A bien pero un AAAA a otro sitio, NO se conecta", async () => {
    const r = await verificarDominio(
      dns(bien({ aaaa: { [DOM]: [V6_AJENO] } })),
      { dominio: DOM, ipDestino: IP, secreto: SECRETO }
    );
    expect(r).toEqual({
      ok: false, motivo: "ipv6", apuntaA: [IP], proveedor: null,
      estorbos: [{ tipo: "ipv6", valores: [V6_AJENO] }],
    });
  });

  it("los enseña TODOS: borrar uno y dejarse el otro no arregla nada", async () => {
    const otro = "2a02:4780:29:8154::2";
    const r = await verificarDominio(
      dns(bien({ aaaa: { [DOM]: [V6_AJENO, otro] } })),
      { dominio: DOM, ipDestino: IP, secreto: SECRETO }
    );
    expect(r.estorbos).toEqual([{ tipo: "ipv6", valores: [V6_AJENO, otro] }]);
  });

  it("si el AAAA es NUESTRO, no estorba", async () => {
    const r = await verificarDominio(
      dns(bien({ aaaa: { [DOM]: ["2606:4700::1"] } })),
      { dominio: DOM, ipDestino: IP, secreto: SECRETO, ipv6Destino: "2606:4700::1" }
    );
    expect(r).toMatchObject({ ok: true, via: "a", estorbos: [] });
  });

  /**
   * Detrás de un proxy los AAAA son del proxy y son correctos. Avisar aquí sería
   * mandar al dueño a romper su propia configuración.
   */
  it("verificando por TXT (proxy), los AAAA del proxy no se tocan", async () => {
    const r = await verificarDominio(
      dns({
        a: { [DOM]: ["104.21.0.1"] },
        aaaa: { [DOM]: ["2606:4700:3037::6815:5796"] },
        txt: { [`${SUBDOMINIO_TXT}.${DOM}`]: [[PREFIJO_TXT + token]] },
      }),
      { dominio: DOM, ipDestino: IP, secreto: SECRETO }
    );
    expect(r).toMatchObject({ ok: true, via: "txt", estorbos: [] });
  });

  it("sin apuntar aquí Y con AAAA ajenos, se cuentan las dos cosas", async () => {
    const r = await verificarDominio(
      dns({ a: { [DOM]: ["1.2.3.4"] }, aaaa: { [DOM]: [V6_AJENO] } }),
      { dominio: DOM, ipDestino: IP, secreto: SECRETO }
    );
    expect(r).toMatchObject({
      ok: false, motivo: "no-apunta", apuntaA: ["1.2.3.4"],
      estorbos: [{ tipo: "ipv6", valores: [V6_AJENO] }],
    });
  });
});

describe("el www", () => {
  it("si no apunta aquí se avisa, pero NO bloquea", async () => {
    const r = await verificarDominio(
      dns({ a: { [DOM]: [IP] } }), // sin www
      { dominio: DOM, ipDestino: IP, secreto: SECRETO }
    );
    expect(r).toMatchObject({ ok: true, via: "a", estorbos: [{ tipo: "www", apuntaA: [] }] });
  });

  it("dice a dónde va cuando va a otro sitio", async () => {
    const r = await verificarDominio(
      dns({ a: { [DOM]: [IP], [`www.${DOM}`]: ["147.79.116.153"] } }),
      { dominio: DOM, ipDestino: IP, secreto: SECRETO }
    );
    expect(r).toMatchObject({ estorbos: [{ tipo: "www", apuntaA: ["147.79.116.153"] }] });
  });

  /**
   * `www.blog.suempresa.com` no existe ni tiene por qué. Avisar de que falta
   * sería mandar a crear un registro que nadie va a teclear jamás.
   */
  it("en un subdominio no se mira: ahí no hay www que valga", async () => {
    const sub = "blog.suempresa.com";
    const r = await verificarDominio(
      dns({ a: { [sub]: [IP] } }),
      { dominio: sub, ipDestino: IP, secreto: SECRETO }
    );
    expect(r).toMatchObject({ ok: true, estorbos: [] });
  });

  it("un dominio con sufijo doble sigue siendo pelado y sí se mira", async () => {
    const r = await verificarDominio(
      dns({ a: { "sucafeteria.co.uk": [IP] } }),
      { dominio: "sucafeteria.co.uk", ipDestino: IP, secreto: SECRETO }
    );
    expect(r).toMatchObject({ estorbos: [{ tipo: "www", apuntaA: [] }] });
  });
});

describe("de quién son los servidores de nombres", () => {
  it("saca el proveedor para poder decirle dónde tiene que ir", async () => {
    const r = await verificarDominio(
      dns(bien({ ns: { [DOM]: ["ns1.dns-parking.com", "ns2.dns-parking.com"] } })),
      { dominio: DOM, ipDestino: IP, secreto: SECRETO }
    );
    expect(r.proveedor).toBe("Hostinger");
  });

  it.each([
    [["gina.ns.cloudflare.com"], "Cloudflare"],
    [["ns01.domaincontrol.com"], "GoDaddy"],
    [["dns1.registrar-servers.com"], "Namecheap"],
    [["ns-1234.awsdns-56.org"], "AWS Route 53"],
    [["dns1.dondominio.com"], "DonDominio"],
    [["ns1.ovh.net"], "OVH"],
  ])("reconoce %s", (ns, esperado) => {
    expect(proveedorDeNs(ns)).toBe(esperado);
  });

  it("no le molesta el punto final ni las mayúsculas del DNS", () => {
    expect(proveedorDeNs(["NS1.Dns-Parking.Com."])).toBe("Hostinger");
  });

  it("ante uno desconocido calla, que es mejor que mandar al panel equivocado", () => {
    expect(proveedorDeNs(["ns1.loquesea.example"])).toBeNull();
    expect(proveedorDeNs([])).toBeNull();
  });

  /** Un dominio que solo CONTENGA el nombre no cuenta: se mira el sufijo. */
  it("no se lo cuela un dominio parecido", () => {
    expect(proveedorDeNs(["ns1.cloudflare.com.malo.example"])).toBeNull();
  });
});

describe("un resolutor sin IPv6 ni NS no rompe nada", () => {
  it("da el veredicto igual, solo que sin diagnóstico extra", async () => {
    const viejo: Resolutor = {
      async resolve4(host) { return host === DOM ? [IP] : []; },
      async resolveTxt() { return []; },
    };
    const r = await verificarDominio(viejo, { dominio: DOM, ipDestino: IP, secreto: SECRETO });
    expect(r).toMatchObject({ ok: true, via: "a", proveedor: null });
  });
});
