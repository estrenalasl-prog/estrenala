import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/src/email/enviar", () => ({ enviarCorreo: vi.fn(), envioActivo: () => true }));

import { enviarCorreo } from "@/src/email/enviar";
import { invitar, aceptarInvitacion, validarRol, type EquipoStore, MSG_ROL_INVALIDO, MSG_EMAIL_INVALIDO, MSG_YA_MIEMBRO } from "@/src/auth/equipo";
import { MSG_ENLACE_INVALIDO } from "@/src/auth/verificacion";
import type { TokenRow, UserRow, MembershipInfo } from "@/src/repositories/accounts";

function memStore() {
  const tokens: (TokenRow & { tokenHash: string })[] = [];
  const users: UserRow[] = [];
  const memberships: { orgId: string; userId: string; rol: string }[] = [];
  const store: EquipoStore = {
    async getUserByEmail(email) { return users.find((u) => u.email === email) ?? null; },
    async getOrg(orgId) { return { id: orgId, nombre: "Espacio" }; },
    async getMembership(orgId, userId): Promise<MembershipInfo | null> {
      const m = memberships.find((x) => x.orgId === orgId && x.userId === userId);
      return m ? { orgId: m.orgId, rol: m.rol } : null;
    },
    async crearMembership(orgId, userId, rol) {
      if (!memberships.find((x) => x.orgId === orgId && x.userId === userId)) memberships.push({ orgId, userId, rol });
    },
    async crearToken(i) {
      tokens.push({ id: crypto.randomUUID(), email: i.email, userId: i.userId, tipo: i.tipo, tokenHash: i.tokenHash, payloadJson: i.payloadJson ?? null, expiraAt: i.expiraAt.toISOString(), usadoAt: null });
    },
    async getTokenPorHash(h) { return tokens.find((t) => t.tokenHash === h) ?? null; },
    async marcarTokenUsado(id) { const t = tokens.find((x) => x.id === id); if (t) t.usadoAt = new Date().toISOString(); },
  };
  return { store, tokens, users, memberships };
}

const tokenDelCorreo = (): string => {
  const m = vi.mocked(enviarCorreo).mock.calls.at(-1)?.[0].html.match(/token=([A-Za-z0-9_-]+)/);
  return m ? m[1] : "";
};

beforeEach(() => vi.mocked(enviarCorreo).mockReset());

describe("validarRol", () => {
  it("acepta owner/editor y rechaza el resto", () => {
    expect(validarRol("owner")).toBe("owner");
    expect(validarRol("editor")).toBe("editor");
    expect(() => validarRol("admin")).toThrow(MSG_ROL_INVALIDO);
  });
});

describe("invitar", () => {
  it("crea token y envía correo con el enlace", async () => {
    const f = memStore();
    await invitar(f.store, { orgId: "o1", orgNombre: "Mi Espacio", email: "Nuevo@Correo.com", rol: "editor", base: "https://app" });
    expect(vi.mocked(enviarCorreo)).toHaveBeenCalledOnce();
    expect(f.tokens[0].tipo).toBe("invitacion");
    expect(f.tokens[0].email).toBe("nuevo@correo.com");
    expect(tokenDelCorreo().length).toBeGreaterThan(20);
  });

  it("email inválido o rol inválido → 400", async () => {
    const f = memStore();
    await expect(invitar(f.store, { orgId: "o1", orgNombre: "X", email: "no-email", rol: "editor", base: "b" }))
      .rejects.toMatchObject({ status: 400, message: MSG_EMAIL_INVALIDO });
    await expect(invitar(f.store, { orgId: "o1", orgNombre: "X", email: "a@b.com", rol: "jefe", base: "b" }))
      .rejects.toMatchObject({ status: 400, message: MSG_ROL_INVALIDO });
  });

  it("si ya es miembro → 409 y no reinvita", async () => {
    const f = memStore();
    f.users.push({ id: "u1", email: "a@b.com", nombre: "A", passwordHash: "", googleSub: null, emailVerificadoAt: null });
    f.memberships.push({ orgId: "o1", userId: "u1", rol: "editor" });
    await expect(invitar(f.store, { orgId: "o1", orgNombre: "X", email: "a@b.com", rol: "editor", base: "b" }))
      .rejects.toMatchObject({ status: 409, message: MSG_YA_MIEMBRO });
    expect(vi.mocked(enviarCorreo)).not.toHaveBeenCalled();
  });
});

describe("aceptarInvitacion", () => {
  it("mete al usuario en la org con el rol invitado y quema el token", async () => {
    const f = memStore();
    await invitar(f.store, { orgId: "o1", orgNombre: "X", email: "a@b.com", rol: "editor", base: "https://app" });
    const r = await aceptarInvitacion(f.store, { tokenPlano: tokenDelCorreo(), userId: "u9" });
    expect(r.orgId).toBe("o1");
    expect(f.memberships).toContainEqual({ orgId: "o1", userId: "u9", rol: "editor" });
    // Reusar el token ya no vale.
    await expect(aceptarInvitacion(f.store, { tokenPlano: tokenDelCorreo(), userId: "u9" }))
      .rejects.toMatchObject({ message: MSG_ENLACE_INVALIDO });
  });

  it("token inventado → enlace inválido", async () => {
    const f = memStore();
    await expect(aceptarInvitacion(f.store, { tokenPlano: "inventado", userId: "u9" }))
      .rejects.toMatchObject({ status: 400, message: MSG_ENLACE_INVALIDO });
  });
});
