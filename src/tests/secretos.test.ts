import { describe, it, expect } from "vitest";
import { cifrar, descifrar, estaCifrado, SecretoError } from "@/src/config/secretos";

// Dos claves maestras distintas, fijas, para que las pruebas sean deterministas.
const ENV = { SECRETS_KEY: Buffer.alloc(32, 7).toString("base64") };
const OTRA = { SECRETS_KEY: Buffer.alloc(32, 9).toString("base64") };

const CLAVE_REAL = "sk-or-v1-0123456789abcdef0123456789abcdef";

describe("cifrar / descifrar", () => {
  it("ida y vuelta devuelve exactamente lo mismo", () => {
    expect(descifrar(cifrar(CLAVE_REAL, ENV), ENV)).toBe(CLAVE_REAL);
  });

  it("el guardado NO contiene la clave por ninguna parte", () => {
    const guardado = cifrar(CLAVE_REAL, ENV);
    expect(guardado).not.toContain(CLAVE_REAL);
    expect(guardado).not.toContain("sk-or");
    expect(guardado.startsWith("s1.")).toBe(true);
  });

  it("cifrar dos veces lo mismo da resultados distintos (el IV es al azar)", () => {
    expect(cifrar(CLAVE_REAL, ENV)).not.toBe(cifrar(CLAVE_REAL, ENV));
  });

  it("aguanta acentos y símbolos", () => {
    const raro = "ñÁ€—clave con espacios y \"comillas\"";
    expect(descifrar(cifrar(raro, ENV), ENV)).toBe(raro);
  });

  it("'' significa «sin clave» y no se cifra", () => {
    expect(cifrar("", ENV)).toBe("");
    expect(descifrar("", ENV)).toBe("");
  });
});

describe("compatibilidad con lo que ya estaba guardado en claro", () => {
  it("una clave legada se devuelve tal cual, sin necesitar SECRETS_KEY", () => {
    expect(descifrar(CLAVE_REAL, {})).toBe(CLAVE_REAL);
  });

  it("estaCifrado distingue el formato nuevo del legado", () => {
    expect(estaCifrado(cifrar(CLAVE_REAL, ENV))).toBe(true);
    expect(estaCifrado(CLAVE_REAL)).toBe(false);
    expect(estaCifrado("s1.no-son-cuatro-partes")).toBe(false);
    expect(estaCifrado("")).toBe(false);
  });
});

describe("integridad y errores", () => {
  it("si alguien toca el texto cifrado, falla en vez de devolver basura", () => {
    const guardado = cifrar(CLAVE_REAL, ENV);
    const partes = guardado.split(".");
    partes[3] = partes[3].slice(0, -2) + (partes[3].endsWith("AA") ? "BB" : "AA");
    expect(() => descifrar(partes.join("."), ENV)).toThrow(SecretoError);
  });

  it("con OTRA clave maestra no se puede leer (es el objetivo de todo esto)", () => {
    expect(() => descifrar(cifrar(CLAVE_REAL, ENV), OTRA)).toThrow(SecretoError);
  });

  it("sin SECRETS_KEY, guardar falla con un mensaje que dice qué hacer", () => {
    expect(() => cifrar(CLAVE_REAL, {})).toThrow(/openssl rand -base64 32/);
  });

  it("una SECRETS_KEY del tamaño equivocado se rechaza al momento", () => {
    const corta = { SECRETS_KEY: Buffer.alloc(16, 1).toString("base64") };
    expect(() => cifrar(CLAVE_REAL, corta)).toThrow(/16 bytes y debe tener 32/);
  });

  it("ningún mensaje de error lleva material de la clave", () => {
    for (const env of [{}, { SECRETS_KEY: Buffer.alloc(16, 1).toString("base64") }]) {
      try {
        cifrar(CLAVE_REAL, env);
      } catch (e) {
        expect((e as Error).message).not.toContain(CLAVE_REAL);
        expect((e as Error).message).not.toContain(env.SECRETS_KEY ?? "@@");
      }
    }
  });
});
