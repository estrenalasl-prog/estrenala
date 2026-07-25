import { describe, it, expect } from "vitest";
import { transferirPropiedad, MSG_ELIGE_OTRA, MSG_NO_MIEMBRO, type TransferenciaStore } from "@/src/auth/equipo";
import { EditorError } from "@/src/editor/errors";
import type { MembershipInfo } from "@/src/repositories/accounts";

function fakeStore(miembros: Record<string, string>) {
  const llamadas: string[] = [];
  const store: TransferenciaStore = {
    async getMembership(orgId, userId): Promise<MembershipInfo | null> {
      return miembros[userId] ? { orgId, rol: miembros[userId] } : null;
    },
    async aplicarTransferencia(orgId, de, a) { llamadas.push(`${orgId}:${de}->${a}`); },
  };
  return { store, llamadas };
}

describe("transferirPropiedad", () => {
  it("ceder a otro miembro: llama a aplicarTransferencia(org, actual, nuevo)", async () => {
    const { store, llamadas } = fakeStore({ me: "owner", ed: "editor" });
    await transferirPropiedad(store, { orgId: "o1", actualUserId: "me", nuevoUserId: "ed" });
    expect(llamadas).toEqual(["o1:me->ed"]);
  });

  it("destino ya propietario: también transfiere (el actual baja a editor)", async () => {
    const { store, llamadas } = fakeStore({ me: "owner", otro: "owner" });
    await transferirPropiedad(store, { orgId: "o1", actualUserId: "me", nuevoUserId: "otro" });
    expect(llamadas).toEqual(["o1:me->otro"]);
  });

  it("a uno mismo → 400 mensaje exacto, sin tocar nada", async () => {
    const { store, llamadas } = fakeStore({ me: "owner" });
    await expect(transferirPropiedad(store, { orgId: "o1", actualUserId: "me", nuevoUserId: "me" }))
      .rejects.toThrowError(MSG_ELIGE_OTRA);
    expect(llamadas).toEqual([]);
  });

  it("userId vacío → 400 mensaje exacto", async () => {
    const { store } = fakeStore({ me: "owner" });
    await expect(transferirPropiedad(store, { orgId: "o1", actualUserId: "me", nuevoUserId: "" }))
      .rejects.toThrowError(MSG_ELIGE_OTRA);
  });

  it("destino no es del espacio → 404 mensaje exacto", async () => {
    const { store, llamadas } = fakeStore({ me: "owner" });
    await expect(transferirPropiedad(store, { orgId: "o1", actualUserId: "me", nuevoUserId: "fuera" }))
      .rejects.toThrowError(MSG_NO_MIEMBRO);
    expect(llamadas).toEqual([]);
  });

  it("el 404 es un EditorError con status 404", async () => {
    const { store } = fakeStore({ me: "owner" });
    await transferirPropiedad(store, { orgId: "o1", actualUserId: "me", nuevoUserId: "x" }).catch((e) => {
      expect(e).toBeInstanceOf(EditorError);
      expect((e as EditorError).status).toBe(404);
    });
  });
});
