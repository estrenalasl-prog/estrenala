import { describe, it, expect } from "vitest";
import { firmarSesion, verificarSesion } from "@/src/auth/session-cookie";

const SECRET = "secreto-de-test-0123456789abcdef";
const USER = "11111111-2222-4333-8444-555555555555";

describe("cookie de sesión v2 (con identidad)", () => {
  it("firma y verifica devolviendo el userId", async () => {
    const v = await firmarSesion(SECRET, USER, Date.now() + 60_000);
    expect(v.startsWith(`v2.${USER}.`)).toBe(true);
    expect(await verificarSesion(SECRET, v, Date.now())).toEqual({ userId: USER });
  });
  it("caducada → null", async () => {
    const v = await firmarSesion(SECRET, USER, Date.now() - 1);
    expect(await verificarSesion(SECRET, v, Date.now())).toBeNull();
  });
  it("manipulada (userId, expira o firma) → null", async () => {
    const v = await firmarSesion(SECRET, USER, Date.now() + 60_000);
    const [, , exp, hmac] = v.split(".");
    const otroUser = "99999999-8888-4777-8666-555555555555";
    expect(await verificarSesion(SECRET, `v2.${otroUser}.${exp}.${hmac}`, Date.now())).toBeNull();
    expect(await verificarSesion(SECRET, `v2.${USER}.${Number(exp) + 9999999}.${hmac}`, Date.now())).toBeNull();
    expect(await verificarSesion(SECRET, `v2.${USER}.${exp}.${"0".repeat(hmac.length)}`, Date.now())).toBeNull();
  });
  it("las v1 antiguas ya no valen", async () => {
    expect(await verificarSesion(SECRET, `v1.${Date.now() + 60_000}.abcdef`, Date.now())).toBeNull();
  });
  it("otro secret → null; basura → null; userId con formato raro → null", async () => {
    const v = await firmarSesion(SECRET, USER, Date.now() + 60_000);
    expect(await verificarSesion("otro-secreto", v, Date.now())).toBeNull();
    expect(await verificarSesion(SECRET, "", Date.now())).toBeNull();
    expect(await verificarSesion(SECRET, "v2.abc", Date.now())).toBeNull();
    expect(await verificarSesion(SECRET, "v2.no-es-uuid.123.abc", Date.now())).toBeNull();
  });
});
