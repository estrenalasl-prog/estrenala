import { describe, it, expect, beforeEach } from "vitest";
import { registrar, autenticar, normalizarEmail } from "@/src/auth/cuentas";
import { hashPassword } from "@/src/auth/password";
import { EditorError } from "@/src/editor/errors";
import type { AccountStore, UserRow, MembershipInfo } from "@/src/repositories/accounts";

// Store en memoria para las pruebas.
function memStore(): AccountStore & { users: UserRow[] } {
  const users: UserRow[] = [];
  return {
    users,
    async getUserByEmail(email) { return users.find((u) => u.email === email) ?? null; },
    async getUserById(id) { return users.find((u) => u.id === id) ?? null; },
    async getMembershipByUser(): Promise<MembershipInfo | null> { return null; },
    async crearCuenta(input) {
      const userId = crypto.randomUUID();
      const orgId = crypto.randomUUID();
      users.push({ id: userId, email: input.email, nombre: input.nombre, passwordHash: input.passwordHash, googleSub: null, emailVerificadoAt: null });
      return { userId, orgId };
    },
    async getUserByGoogleSub() { return null; },
    async crearCuentaGoogle() { return { userId: crypto.randomUUID(), orgId: crypto.randomUUID() }; },
    async vincularGoogle() {},
    async crearToken() {},
    async getTokenPorHash() { return null; },
    async marcarTokenUsado() {},
    async invalidarTokens() {},
    async marcarEmailVerificado() {},
    async setPassword() {},
  };
}

async function conUsuario(store: ReturnType<typeof memStore>, email: string, password: string) {
  store.users.push({ id: crypto.randomUUID(), email, nombre: "Ya", passwordHash: await hashPassword(password), googleSub: null, emailVerificadoAt: null });
}

describe("registrar", () => {
  let store: ReturnType<typeof memStore>;
  beforeEach(() => { store = memStore(); });

  it("crea la cuenta con email normalizado y org propia", async () => {
    const r = await registrar(store, { nombre: "  Sebas  ", email: "  Sebas@Correo.COM ", password: "supersecreta" });
    expect(r.userId).toBeTruthy();
    expect(r.orgId).toBeTruthy();
    expect(store.users[0].email).toBe("sebas@correo.com");
    expect(store.users[0].nombre).toBe("Sebas");
    expect(store.users[0].passwordHash.startsWith("s1.")).toBe(true);
  });

  it("sin nombre → 400 byte-exacto", async () => {
    await expect(registrar(store, { nombre: "  ", email: "a@b.com", password: "12345678" }))
      .rejects.toMatchObject({ status: 400, message: "Escribe tu nombre" });
  });

  it("email inválido → 400 byte-exacto", async () => {
    await expect(registrar(store, { nombre: "A", email: "no-es-email", password: "12345678" }))
      .rejects.toMatchObject({ status: 400, message: "Ese correo no parece válido" });
  });

  it("contraseña corta → 400 byte-exacto", async () => {
    await expect(registrar(store, { nombre: "A", email: "a@b.com", password: "1234567" }))
      .rejects.toMatchObject({ status: 400, message: "La contraseña necesita al menos 8 caracteres" });
  });

  it("email ya registrado (case-insensitive) → 409 byte-exacto", async () => {
    await conUsuario(store, "a@b.com", "12345678");
    await expect(registrar(store, { nombre: "A", email: "A@B.com", password: "12345678" }))
      .rejects.toMatchObject({ status: 409, message: "Ese correo ya tiene cuenta" });
  });
});

describe("autenticar", () => {
  let store: ReturnType<typeof memStore>;
  beforeEach(() => { store = memStore(); });

  it("credenciales correctas → userId", async () => {
    await conUsuario(store, "a@b.com", "contraseña123");
    const r = await autenticar(store, { email: "A@B.COM", password: "contraseña123" });
    expect(r.userId).toBe(store.users[0].id);
  });

  it("contraseña incorrecta → 401 mensaje neutro", async () => {
    await conUsuario(store, "a@b.com", "contraseña123");
    await expect(autenticar(store, { email: "a@b.com", password: "otra-cosa" }))
      .rejects.toMatchObject({ status: 401, message: "Correo o contraseña incorrectos" });
  });

  it("email inexistente → mismo 401 neutro (no revela si existe)", async () => {
    await expect(autenticar(store, { email: "nadie@b.com", password: "loquesea1" }))
      .rejects.toMatchObject({ status: 401, message: "Correo o contraseña incorrectos" });
  });

  it("cuenta sin contraseña (solo Google) no entra por contraseña", async () => {
    store.users.push({ id: crypto.randomUUID(), email: "g@b.com", nombre: "G", passwordHash: "", googleSub: "sub-1", emailVerificadoAt: null });
    await expect(autenticar(store, { email: "g@b.com", password: "" }))
      .rejects.toMatchObject({ status: 401 });
  });
});

describe("normalizarEmail", () => {
  it("recorta y pasa a minúsculas; entradas raras → ''", () => {
    expect(normalizarEmail("  A@B.com ")).toBe("a@b.com");
    expect(normalizarEmail(123)).toBe("");
    expect(normalizarEmail(undefined)).toBe("");
  });
});
