import { describe, it, expect } from "vitest";
import { firmarSesion, verificarSesion } from "@/src/auth/session-cookie";

const SECRET = "secreto-de-test-0123456789abcdef";

describe("cookie de sesión", () => {
  it("firma y verifica", async () => {
    const v = await firmarSesion(SECRET, Date.now() + 60_000);
    expect(v.startsWith("v1.")).toBe(true);
    expect(await verificarSesion(SECRET, v, Date.now())).toBe(true);
  });
  it("caducada → false", async () => {
    const v = await firmarSesion(SECRET, Date.now() - 1);
    expect(await verificarSesion(SECRET, v, Date.now())).toBe(false);
  });
  it("manipulada → false", async () => {
    const v = await firmarSesion(SECRET, Date.now() + 60_000);
    const [, exp, hmac] = v.split(".");
    expect(await verificarSesion(SECRET, `v1.${Number(exp) + 9999999}.${hmac}`, Date.now())).toBe(false);
    expect(await verificarSesion(SECRET, `v1.${exp}.${"0".repeat(hmac.length)}`, Date.now())).toBe(false);
  });
  it("otro secret → false; basura → false", async () => {
    const v = await firmarSesion(SECRET, Date.now() + 60_000);
    expect(await verificarSesion("otro-secreto", v, Date.now())).toBe(false);
    expect(await verificarSesion(SECRET, "", Date.now())).toBe(false);
    expect(await verificarSesion(SECRET, "v1.abc", Date.now())).toBe(false);
    expect(await verificarSesion(SECRET, "v2.123.abc", Date.now())).toBe(false);
  });
});
