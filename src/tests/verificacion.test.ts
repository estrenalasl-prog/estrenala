import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/src/email/enviar", () => ({ enviarCorreo: vi.fn(), envioActivo: () => true }));

import { enviarCorreo } from "@/src/email/enviar";
import { generarToken, hashToken } from "@/src/auth/tokens";
import {
  enviarVerificacion, verificarEmail, solicitarReset, aplicarReset,
  MSG_ENLACE_INVALIDO, MSG_PASSWORD_CORTA,
} from "@/src/auth/verificacion";
import type { AccountStore, TokenRow, UserRow } from "@/src/repositories/accounts";

// Store en memoria con lo justo para tokens + usuarios.
function memStore() {
  const tokens: (TokenRow & { tokenHash: string })[] = [];
  const users: UserRow[] = [];
  const marcados: { verificado: string[]; passwords: Record<string, string> } = { verificado: [], passwords: {} };
  const store: AccountStore = {
    async getUserByEmail(email) { return users.find((u) => u.email === email) ?? null; },
    async getUserById(id) { return users.find((u) => u.id === id) ?? null; },
    async getUserByGoogleSub() { return null; },
    async getMembershipByUser() { return null; },
    async getMembership() { return null; },
    async crearCuenta() { return { userId: "x", orgId: "y" }; },
    async crearCuentaGoogle() { return { userId: "x", orgId: "y" }; },
    async vincularGoogle() {},
    async crearToken(i) {
      tokens.push({
        id: crypto.randomUUID(), email: i.email, userId: i.userId, tipo: i.tipo,
        tokenHash: i.tokenHash, payloadJson: i.payloadJson ?? null,
        expiraAt: i.expiraAt.toISOString(), usadoAt: null,
      });
    },
    async getTokenPorHash(h) { return tokens.find((t) => t.tokenHash === h) ?? null; },
    async marcarTokenUsado(id) { const t = tokens.find((x) => x.id === id); if (t) t.usadoAt = new Date().toISOString(); },
    async invalidarTokens(email, tipo) { for (const t of tokens) if (t.email === email && t.tipo === tipo) t.usadoAt = new Date().toISOString(); },
    async marcarEmailVerificado(userId) { marcados.verificado.push(userId); },
    async setPassword(userId, hash) { marcados.passwords[userId] = hash; },
    async setIdioma() {},
  };
  return { store, tokens, users, marcados };
}

const enlaceToken = (): string => {
  const m = vi.mocked(enviarCorreo).mock.calls.at(-1)?.[0].html.match(/token=([A-Za-z0-9_-]+)/);
  return m ? m[1] : "";
};

beforeEach(() => vi.mocked(enviarCorreo).mockReset());

describe("tokens", () => {
  it("hashToken es determinista; generarToken produce token+hash coherentes", () => {
    const { token, hash } = generarToken();
    expect(hash).toBe(hashToken(token));
    expect(generarToken().token).not.toBe(token); // aleatorio
  });
});

describe("verificación de email", () => {
  it("envía un correo con el enlace y luego el token verifica al usuario una sola vez", async () => {
    const f = memStore();
    await enviarVerificacion(f.store, { userId: "u1", email: "a@b.com", nombre: "Ana", base: "https://app" });
    expect(vi.mocked(enviarCorreo)).toHaveBeenCalledOnce();
    const token = enlaceToken();
    expect(token.length).toBeGreaterThan(20);

    await verificarEmail(f.store, token);
    expect(f.marcados.verificado).toEqual(["u1"]);

    // Reutilizar el mismo token ya no vale.
    await expect(verificarEmail(f.store, token)).rejects.toMatchObject({ status: 400, message: MSG_ENLACE_INVALIDO });
  });

  it("token inexistente o vacío → enlace inválido", async () => {
    const f = memStore();
    await expect(verificarEmail(f.store, "")).rejects.toMatchObject({ message: MSG_ENLACE_INVALIDO });
    await expect(verificarEmail(f.store, "inventado")).rejects.toMatchObject({ message: MSG_ENLACE_INVALIDO });
  });

  it("token caducado → enlace inválido", async () => {
    const f = memStore();
    const { token, hash } = generarToken();
    f.tokens.push({ id: "t", email: "a@b.com", userId: "u1", tipo: "verificacion", tokenHash: hash, payloadJson: null, expiraAt: new Date(Date.now() - 1000).toISOString(), usadoAt: null });
    await expect(verificarEmail(f.store, token)).rejects.toMatchObject({ message: MSG_ENLACE_INVALIDO });
  });
});

describe("reset de contraseña", () => {
  const conUsuario = (f: ReturnType<typeof memStore>) =>
    f.users.push({ id: "u1", email: "a@b.com", nombre: "Ana", passwordHash: "s1.x.y", googleSub: null, emailVerificadoAt: null, idioma: null });

  it("solicitar con cuenta existente envía el correo; el token cambia la contraseña", async () => {
    const f = memStore(); conUsuario(f);
    await solicitarReset(f.store, "a@b.com", "https://app");
    expect(vi.mocked(enviarCorreo)).toHaveBeenCalledOnce();
    await aplicarReset(f.store, enlaceToken(), "nueva-contraseña-1", async (p) => `hash(${p})`);
    expect(f.marcados.passwords["u1"]).toBe("hash(nueva-contraseña-1)");
  });

  it("solicitar con cuenta inexistente NO envía correo pero no revela nada (no lanza)", async () => {
    const f = memStore();
    await expect(solicitarReset(f.store, "nadie@b.com", "https://app")).resolves.toBeUndefined();
    expect(vi.mocked(enviarCorreo)).not.toHaveBeenCalled();
  });

  it("contraseña corta → mensaje byte-exacto y no cambia nada", async () => {
    const f = memStore(); conUsuario(f);
    await solicitarReset(f.store, "a@b.com", "https://app");
    await expect(aplicarReset(f.store, enlaceToken(), "corta", async (p) => p))
      .rejects.toMatchObject({ status: 400, message: MSG_PASSWORD_CORTA });
    expect(f.marcados.passwords["u1"]).toBeUndefined();
  });

  it("un segundo reset invalida el token del primero", async () => {
    const f = memStore(); conUsuario(f);
    await solicitarReset(f.store, "a@b.com", "https://app");
    const primero = enlaceToken();
    await solicitarReset(f.store, "a@b.com", "https://app");
    await expect(aplicarReset(f.store, primero, "otra-contraseña-9", async (p) => p))
      .rejects.toMatchObject({ message: MSG_ENLACE_INVALIDO });
  });
});
