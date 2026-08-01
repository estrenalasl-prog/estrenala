import { describe, it, expect } from "vitest";
import { normalizarDominio, formatoDominioValido, dominioProhibido, esDominioRaiz } from "@/src/publish/domain";

describe("normalizarDominio", () => {
  it("minúsculas, sin esquema, sin ruta, sin www, sin punto final", () => {
    expect(normalizarDominio("HTTPS://WWW.Mi-Empresa.com/contacto?x=1")).toBe("mi-empresa.com");
    expect(normalizarDominio("  cliente.es. ")).toBe("cliente.es");
    expect(normalizarDominio("http://foo.bar.baz")).toBe("foo.bar.baz");
  });
});

describe("formatoDominioValido", () => {
  it("acepta dominios reales", () => {
    for (const d of ["miempresa.com", "quantivatechnology.com", "a.co", "sub.dominio.es", "xn--espaa-rta.com"]) {
      expect(formatoDominioValido(d), d).toBe(true);
    }
  });
  it("rechaza basura, IPs y labels malos", () => {
    for (const d of ["", "sin-punto", "-mal.com", "mal-.com", "1.2.3.4", "foo..com", "foo.c", "foo.com/x", "foo .com", "*.foo.com"]) {
      expect(formatoDominioValido(d), d).toBe(false);
    }
  });
});

// Decide si además del dominio se registra su `www.`. Nadie escribe `www.`
// delante de un subdominio, y registrarlo dejaba a Traefik pidiendo para siempre
// un certificado que Let's Encrypt nunca podía dar.
describe("esDominioRaiz", () => {
  it("el dominio pelado sí lo es", () => {
    for (const d of ["suempresa.com", "cliente.es", "a.co", "mi-tienda.online"]) {
      expect(esDominioRaiz(d), d).toBe(true);
    }
  });
  it("lo que cuelga de él, no", () => {
    for (const d of ["web.suempresa.com", "blog.cliente.es", "prueba.quantivatechnology.com", "a.b.c.suempresa.com"]) {
      expect(esDominioRaiz(d), d).toBe(false);
    }
  });
  // Tres etiquetas y sigue siendo pelado: por eso no vale con contar puntos.
  it("los sufijos de dos etiquetas cuentan como pelado", () => {
    for (const d of ["suempresa.co.uk", "cliente.com.ar", "tienda.com.mx", "cosa.com.es"]) {
      expect(esDominioRaiz(d), d).toBe(true);
    }
  });
  it("pero un subdominio bajo un sufijo doble tampoco lo es", () => {
    expect(esDominioRaiz("web.suempresa.co.uk")).toBe(false);
  });
});

describe("dominioProhibido", () => {
  it("prohíbe la plataforma, la base y todo lo que cuelgue de ellas", () => {
    expect(dominioProhibido("plataforma.com", "app.plataforma.com", "plataforma.com")).toBe(true);
    expect(dominioProhibido("app.plataforma.com", "app.plataforma.com", "plataforma.com")).toBe(true);
    expect(dominioProhibido("x.plataforma.com", "app.plataforma.com", "plataforma.com")).toBe(true);
    expect(dominioProhibido("sub.localhost", "localhost:3000", "localhost:3000")).toBe(true);
  });
  it("permite dominios ajenos", () => {
    expect(dominioProhibido("cliente.com", "app.plataforma.com", "plataforma.com")).toBe(false);
    expect(dominioProhibido("miplataforma.com.es", "app.plataforma.com", "plataforma.com")).toBe(false);
  });
});
