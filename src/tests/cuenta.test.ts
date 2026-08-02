import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/src/email/enviar", () => ({ enviarCorreo: vi.fn(), envioActivo: () => true }));

import { enviarCorreo } from "@/src/email/enviar";
import { hashPassword } from "@/src/auth/password";
import {
  cambiarNombre, cambiarPassword, solicitarCambioEmail, confirmarCambioEmail,
  MSG_NOMBRE, MSG_PASSWORD_CORTA, MSG_PASSWORD_ACTUAL, MSG_EMAIL_EN_USO, type CuentaStore,
} from "@/src/auth/cuenta";
import { MSG_ENLACE_INVALIDO } from "@/src/auth/verificacion";
import type { UserRow, TokenRow } from "@/src/repositories/accounts";

function memStore() {
  const users: UserRow[] = [];
  const tokens: (TokenRow & { tokenHash: string })[] = [];
  const cambios = { nombres: {} as Record<string, string>, emails: {} as Record<string, string>, passwords: {} as Record<string, string> };
  const store: CuentaStore = {
    async getUserById(id) { return users.find((u) => u.id === id) ?? null; },
    async getUserByEmail(email) { return users.find((u) => u.email === email) ?? null; },
    async setNombre(id, n) { cambios.nombres[id] = n; },
    async setPassword(id, h) { cambios.passwords[id] = h; },
    async setEmail(id, e) { cambios.emails[id] = e; },
    async crearToken(i) { tokens.push({ id: crypto.randomUUID(), email: i.email, userId: i.userId, tipo: i.tipo, tokenHash: i.tokenHash, payloadJson: i.payloadJson ?? null, expiraAt: i.expiraAt.toISOString(), usadoAt: null }); },
    async getTokenPorHash(h) { return tokens.find((t) => t.tokenHash === h) ?? null; },
    async marcarTokenUsado(id) { const t = tokens.find((x) => x.id === id); if (t) t.usadoAt = new Date().toISOString(); },
  };
  return { store, users, cambios };
}

const tokenDelCorreo = (): string => {
  const m = vi.mocked(enviarCorreo).mock.calls.at(-1)?.[0].html.match(/token=([A-Za-z0-9_-]+)/);
  return m ? m[1] : "";
};

async function conUsuario(f: ReturnType<typeof memStore>, id: string, email: string, password: string) {
  f.users.push({ id, email, nombre: "Ana", passwordHash: password ? await hashPassword(password) : "", googleSub: null, emailVerificadoAt: null, idioma: null });
}

beforeEach(() => vi.mocked(enviarCorreo).mockReset());

describe("cambiarNombre", () => {
  it("guarda el nombre recortado; vacío → 400", async () => {
    const f = memStore();
    await cambiarNombre(f.store, "u1", "  Nuevo Nombre ");
    expect(f.cambios.nombres["u1"]).toBe("Nuevo Nombre");
    await expect(cambiarNombre(f.store, "u1", "   ")).rejects.toMatchObject({ status: 400, message: MSG_NOMBRE });
  });
});

describe("cambiarPassword", () => {
  it("con la actual correcta cambia; incorrecta → 400; corta → 400", async () => {
    const f = memStore(); await conUsuario(f, "u1", "a@b.com", "actual-buena-1");
    await cambiarPassword(f.store, { userId: "u1", actual: "actual-buena-1", nueva: "nueva-larga-2" });
    expect(f.cambios.passwords["u1"]).toMatch(/^s1\./);
    await expect(cambiarPassword(f.store, { userId: "u1", actual: "no-es", nueva: "otra-larga-3" }))
      .rejects.toMatchObject({ status: 400, message: MSG_PASSWORD_ACTUAL });
    await expect(cambiarPassword(f.store, { userId: "u1", actual: "actual-buena-1", nueva: "corta" }))
      .rejects.toMatchObject({ status: 400, message: MSG_PASSWORD_CORTA });
  });

  it("cuenta solo-Google (sin contraseña) puede ponerse una sin la actual", async () => {
    const f = memStore(); await conUsuario(f, "u2", "g@b.com", "");
    await cambiarPassword(f.store, { userId: "u2", actual: "", nueva: "primera-contra-9" });
    expect(f.cambios.passwords["u2"]).toMatch(/^s1\./);
  });
});

describe("cambiar email (doble confirmación)", () => {
  it("solicita al correo NUEVO y solo aplica al confirmar el token", async () => {
    const f = memStore(); await conUsuario(f, "u1", "viejo@b.com", "x1234567");
    await solicitarCambioEmail(f.store, { userId: "u1", nuevoEmail: "Nuevo@B.com", base: "https://app" });
    expect(vi.mocked(enviarCorreo).mock.calls[0][0].para).toBe("nuevo@b.com");
    expect(f.cambios.emails["u1"]).toBeUndefined(); // todavía no se aplicó

    await confirmarCambioEmail(f.store, tokenDelCorreo());
    expect(f.cambios.emails["u1"]).toBe("nuevo@b.com");
    // Reusar el token ya no vale.
    await expect(confirmarCambioEmail(f.store, tokenDelCorreo())).rejects.toMatchObject({ message: MSG_ENLACE_INVALIDO });
  });

  it("si el correo nuevo ya es de otra cuenta → 409 y no envía", async () => {
    const f = memStore();
    await conUsuario(f, "u1", "yo@b.com", "x1234567");
    await conUsuario(f, "u2", "ocupado@b.com", "y1234567");
    await expect(solicitarCambioEmail(f.store, { userId: "u1", nuevoEmail: "ocupado@b.com", base: "b" }))
      .rejects.toMatchObject({ status: 409, message: MSG_EMAIL_EN_USO });
    expect(vi.mocked(enviarCorreo)).not.toHaveBeenCalled();
  });
});
