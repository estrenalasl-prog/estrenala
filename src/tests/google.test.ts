import { describe, it, expect } from "vitest";
import { urlAutorizacion, obtenerPerfilGoogle, resolverUsuarioGoogle, type PerfilGoogle } from "@/src/auth/google";
import type { AccountStore, UserRow } from "@/src/repositories/accounts";

function memStore() {
  const users: UserRow[] = [];
  const acciones: string[] = [];
  const store: AccountStore = {
    async getUserByEmail(email) { return users.find((u) => u.email === email) ?? null; },
    async getUserById(id) { return users.find((u) => u.id === id) ?? null; },
    async getUserByGoogleSub(sub) { return users.find((u) => u.googleSub === sub) ?? null; },
    async getMembershipByUser() { return null; },
    async crearCuenta() { return { userId: "x", orgId: "y" }; },
    async crearCuentaGoogle(i) {
      const id = crypto.randomUUID();
      users.push({ id, email: i.email, nombre: i.nombre, passwordHash: "", googleSub: i.googleSub, emailVerificadoAt: new Date().toISOString() });
      acciones.push("crear");
      return { userId: id, orgId: crypto.randomUUID() };
    },
    async vincularGoogle(userId, sub) { const u = users.find((x) => x.id === userId); if (u) u.googleSub = sub; acciones.push("vincular"); },
    async crearToken() {}, async getTokenPorHash() { return null; }, async marcarTokenUsado() {},
    async invalidarTokens() {}, async marcarEmailVerificado() {}, async setPassword() {},
  };
  return { store, users, acciones };
}

const perfil: PerfilGoogle = { sub: "google-123", email: "ana@correo.com", emailVerificado: true, nombre: "Ana" };

describe("urlAutorizacion", () => {
  it("arma la URL de Google con los parámetros correctos", () => {
    const u = urlAutorizacion({ clientId: "cid", redirectUri: "https://app/cb", state: "st4te" });
    expect(u).toContain("accounts.google.com");
    expect(u).toContain("client_id=cid");
    expect(u).toContain("redirect_uri=https%3A%2F%2Fapp%2Fcb");
    expect(u).toContain("response_type=code");
    expect(u).toContain("state=st4te");
    expect(u).toContain("scope=openid+email+profile");
  });
});

describe("resolverUsuarioGoogle", () => {
  it("cuenta nueva: crea usuario ya verificado", async () => {
    const f = memStore();
    const { userId } = await resolverUsuarioGoogle(f.store, perfil);
    expect(userId).toBeTruthy();
    expect(f.acciones).toEqual(["crear"]);
    expect(f.users[0].emailVerificadoAt).toBeTruthy();
    expect(f.users[0].passwordHash).toBe("");
  });

  it("mismo googleSub: entra sin crear ni vincular", async () => {
    const f = memStore();
    f.users.push({ id: "u1", email: "ana@correo.com", nombre: "Ana", passwordHash: "", googleSub: "google-123", emailVerificadoAt: "x" });
    const { userId } = await resolverUsuarioGoogle(f.store, perfil);
    expect(userId).toBe("u1");
    expect(f.acciones).toEqual([]);
  });

  it("email ya existe con contraseña pero sin Google: vincula y entra", async () => {
    const f = memStore();
    f.users.push({ id: "u2", email: "ana@correo.com", nombre: "Ana", passwordHash: "s1.a.b", googleSub: null, emailVerificadoAt: null });
    const { userId } = await resolverUsuarioGoogle(f.store, perfil);
    expect(userId).toBe("u2");
    expect(f.acciones).toEqual(["vincular"]);
    expect(f.users[0].googleSub).toBe("google-123");
  });
});

describe("obtenerPerfilGoogle", () => {
  it("intercambia el code y normaliza el perfil", async () => {
    const fetchFake = (async (url: string) => {
      if (String(url).includes("token")) return new Response(JSON.stringify({ access_token: "tok" }), { status: 200 });
      return new Response(JSON.stringify({ sub: "s1", email: "ANA@Correo.com", email_verified: true, name: "Ana" }), { status: 200 });
    }) as unknown as typeof fetch;
    const p = await obtenerPerfilGoogle({ code: "c", clientId: "id", clientSecret: "sec", redirectUri: "u" }, fetchFake);
    expect(p).toEqual({ sub: "s1", email: "ana@correo.com", emailVerificado: true, nombre: "Ana" });
  });

  it("si Google no da token → error genérico 502", async () => {
    const fetchFake = (async () => new Response(JSON.stringify({}), { status: 200 })) as unknown as typeof fetch;
    await expect(obtenerPerfilGoogle({ code: "c", clientId: "i", clientSecret: "s", redirectUri: "u" }, fetchFake))
      .rejects.toMatchObject({ status: 502, message: "No se pudo validar con Google" });
  });
});
