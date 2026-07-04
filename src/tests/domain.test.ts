import { describe, it, expect } from "vitest";
import { normalizarDominio, formatoDominioValido, dominioProhibido } from "@/src/publish/domain";

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
