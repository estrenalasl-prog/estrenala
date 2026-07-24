import { describe, it, expect } from "vitest";
import { hashPassword, verificarPassword } from "@/src/auth/password";

describe("hash de contraseñas (scrypt)", () => {
  it("hashea y verifica la contraseña correcta", async () => {
    const h = await hashPassword("mi contraseña segura");
    expect(h.startsWith("s1.")).toBe(true);
    expect(await verificarPassword("mi contraseña segura", h)).toBe(true);
  });

  it("rechaza la contraseña incorrecta", async () => {
    const h = await hashPassword("correcta12345");
    expect(await verificarPassword("incorrecta1234", h)).toBe(false);
    expect(await verificarPassword("", h)).toBe(false);
  });

  it("cada hash lleva su salt: la misma contraseña da hashes distintos", async () => {
    const a = await hashPassword("repetida123");
    const b = await hashPassword("repetida123");
    expect(a).not.toBe(b);
    expect(await verificarPassword("repetida123", a)).toBe(true);
    expect(await verificarPassword("repetida123", b)).toBe(true);
  });

  it("guardado vacío o con formato raro → false sin lanzar (p. ej. cuentas solo-Google)", async () => {
    expect(await verificarPassword("loquesea123", "")).toBe(false);
    expect(await verificarPassword("loquesea123", "v9.zzz")).toBe(false);
    expect(await verificarPassword("loquesea123", "s1.!!!.???")).toBe(false);
    expect(await verificarPassword("loquesea123", "s1.Y29ydG8.Y29ydG8")).toBe(false);
  });

  it("acentos y emojis en la contraseña funcionan", async () => {
    const h = await hashPassword("contraseña-ñ-🔒");
    expect(await verificarPassword("contraseña-ñ-🔒", h)).toBe(true);
    expect(await verificarPassword("contrasena-n-🔒", h)).toBe(false);
  });
});
