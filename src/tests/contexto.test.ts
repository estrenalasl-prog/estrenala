import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("next/headers", () => ({ cookies: vi.fn() }));

import { cookies } from "next/headers";
import { firmarSesion } from "@/src/auth/session-cookie";
import { getContexto } from "@/src/auth/contexto";
import type { AccountStore, MembershipInfo } from "@/src/repositories/accounts";

const SECRET = "secreto-de-test-0123456789abcdef";
const USER = "11111111-2222-4333-8444-555555555555";

function fakeStore(membership: MembershipInfo | null): AccountStore {
  return {
    getMembershipByUser: async () => membership,
    getMembership: async () => null,
    getUserByEmail: async () => null,
    getUserById: async () => null,
    getUserByGoogleSub: async () => null,
    crearCuenta: async () => ({ userId: "x", orgId: "y" }),
    crearCuentaGoogle: async () => ({ userId: "x", orgId: "y" }),
    vincularGoogle: async () => {},
    crearToken: async () => {},
    getTokenPorHash: async () => null,
    marcarTokenUsado: async () => {},
    invalidarTokens: async () => {},
    marcarEmailVerificado: async () => {},
    setPassword: async () => {},
  };
}

function ponerCookie(value: string | undefined) {
  // Solo responde a la cookie de sesión (wc_session); wc_org no está puesta en
  // estas pruebas, así que el contexto usa el primer membership del usuario.
  vi.mocked(cookies).mockResolvedValue(
    { get: (name: string) => (name === "wc_session" && value ? { value } : undefined) } as unknown as Awaited<ReturnType<typeof cookies>>
  );
}

beforeEach(() => {
  process.env.SESSION_SECRET = SECRET;
  vi.mocked(cookies).mockReset();
});

describe("getContexto", () => {
  it("cookie válida + membership → {userId, orgId, rol}", async () => {
    ponerCookie(await firmarSesion(SECRET, USER, Date.now() + 60_000));
    const ctx = await getContexto(fakeStore({ orgId: "org-1", rol: "owner" }));
    expect(ctx).toEqual({ userId: USER, orgId: "org-1", rol: "owner" });
  });

  it("sin cookie → 401 No autorizado", async () => {
    ponerCookie(undefined);
    await expect(getContexto(fakeStore(null))).rejects.toMatchObject({ status: 401, message: "No autorizado" });
  });

  it("cookie válida pero el usuario no tiene membership → 401", async () => {
    ponerCookie(await firmarSesion(SECRET, USER, Date.now() + 60_000));
    await expect(getContexto(fakeStore(null))).rejects.toMatchObject({ status: 401 });
  });

  it("cookie manipulada → 401 (no consulta membership)", async () => {
    ponerCookie(`v2.${USER}.9999999999999.deadbeef`);
    const store = fakeStore({ orgId: "o", rol: "owner" });
    const espia = vi.spyOn(store, "getMembershipByUser");
    await expect(getContexto(store)).rejects.toMatchObject({ status: 401 });
    expect(espia).not.toHaveBeenCalled();
  });
});
