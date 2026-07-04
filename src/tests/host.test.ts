import { describe, it, expect } from "vitest";
import { parseHost } from "@/src/publish/host";

const PLAT = "localhost:3000";

describe("parseHost", () => {
  it("host de la plataforma (con normalización de mayúsculas)", () => {
    expect(parseHost("localhost:3000", PLAT)).toEqual({ tipo: "plataforma" });
    expect(parseHost("LOCALHOST:3000", PLAT)).toEqual({ tipo: "plataforma" });
  });
  it("loopback cuenta como plataforma (ergonomía dev)", () => {
    expect(parseHost("127.0.0.1:3000", PLAT)).toEqual({ tipo: "plataforma" });
    expect(parseHost("[::1]:3000", PLAT)).toEqual({ tipo: "plataforma" });
  });
  it("subdominio de la plataforma (una sola etiqueta)", () => {
    expect(parseHost("cafeteria-aurora.localhost:3000", PLAT))
      .toEqual({ tipo: "subdominio", valor: "cafeteria-aurora" });
  });
  it("multi-etiqueta bajo la plataforma → desconocido", () => {
    expect(parseHost("a.b.localhost:3000", PLAT)).toEqual({ tipo: "desconocido" });
  });
  it("dominio propio (quita el puerto)", () => {
    expect(parseHost("quantivatechnology.com", PLAT)).toEqual({ tipo: "dominio", valor: "quantivatechnology.com" });
    expect(parseHost("QuantivaTechnology.com:3000", PLAT)).toEqual({ tipo: "dominio", valor: "quantivatechnology.com" });
  });
  it("vacío o basura → desconocido", () => {
    expect(parseHost("", PLAT)).toEqual({ tipo: "desconocido" });
    expect(parseHost("no válido!!", PLAT)).toEqual({ tipo: "desconocido" });
  });
  it("subdominio con caracteres inválidos → desconocido", () => {
    expect(parseHost("sub!.localhost:3000", PLAT)).toEqual({ tipo: "desconocido" });
    expect(parseHost("a_b.localhost:3000", PLAT)).toEqual({ tipo: "desconocido" });
  });
});

describe("parseHost con panel separado (producción)", () => {
  const PANEL = "app.plataforma.com";
  const BASE = "plataforma.com";
  it("host del panel", () => {
    expect(parseHost("app.plataforma.com", PANEL, BASE)).toEqual({ tipo: "plataforma" });
  });
  it("raíz del dominio madre", () => {
    expect(parseHost("plataforma.com", PANEL, BASE)).toEqual({ tipo: "raiz" });
  });
  it("subdominio de sitio bajo la base", () => {
    expect(parseHost("cafeteria.plataforma.com", PANEL, BASE))
      .toEqual({ tipo: "subdominio", valor: "cafeteria" });
  });
  it("multi-etiqueta bajo la base → desconocido", () => {
    expect(parseHost("a.b.plataforma.com", PANEL, BASE)).toEqual({ tipo: "desconocido" });
  });
  it("dominio propio", () => {
    expect(parseHost("quantivatechnology.com", PANEL, BASE))
      .toEqual({ tipo: "dominio", valor: "quantivatechnology.com" });
  });
  it("sin tercer argumento se comporta como hoy (dev)", () => {
    expect(parseHost("sub.localhost:3000", "localhost:3000"))
      .toEqual({ tipo: "subdominio", valor: "sub" });
    expect(parseHost("localhost:3000", "localhost:3000")).toEqual({ tipo: "plataforma" });
  });
});
