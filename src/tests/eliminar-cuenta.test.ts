import { describe, it, expect } from "vitest";
import { eliminarCuenta, MSG_ULTIMO_OWNER_CUENTA, type BorradoCuentaStore, type BorradoProyectosDeOrg } from "@/src/auth/eliminar-cuenta";
import { EditorError } from "@/src/editor/errors";
import type { StorageAdapter } from "@/src/storage/types";

class FakeStorage implements StorageAdapter {
  files = new Map<string, Buffer>();
  async put(k: string, b: Buffer | string) { this.files.set(k, Buffer.isBuffer(b) ? b : Buffer.from(b)); }
  async get(k: string) { const b = this.files.get(k); return b ? { body: b, contentType: "x" } : null; }
  async list(prefix: string) { return [...this.files.keys()].filter((k) => k.startsWith(prefix)); }
  async delete(k: string) { this.files.delete(k); }
}

// Store de cuentas configurable. orgs: [{orgId, rol, owners, miembros}]
function fakes(orgs: { orgId: string; rol: string; owners: number; miembros: number }[], proyectosPorOrg: Record<string, string[]> = {}) {
  const log: string[] = [];
  const cuentas: BorradoCuentaStore = {
    async listOrgsDeUsuario() { return orgs.map((o) => ({ orgId: o.orgId, rol: o.rol })); },
    async contarPropietarios(orgId) { return orgs.find((o) => o.orgId === orgId)!.owners; },
    async contarMiembros(orgId) { return orgs.find((o) => o.orgId === orgId)!.miembros; },
    async eliminarEspacio(orgId) { log.push(`espacio:${orgId}`); },
    async eliminarUsuario(userId) { log.push(`usuario:${userId}`); },
  };
  const proyectos: BorradoProyectosDeOrg = {
    async listProjects(orgId) { return (proyectosPorOrg[orgId] ?? []).map((id) => ({ id })); },
    async deleteProjectCascade(_o, id) { log.push(`proyecto:${id}`); },
  };
  return { cuentas, proyectos, log };
}

describe("eliminarCuenta", () => {
  it("usuario solo (único espacio, único miembro): borra proyectos + espacio + usuario", async () => {
    const storage = new FakeStorage();
    storage.files.set("projects/pA/snapshots/s0/index.html", Buffer.from("x"));
    const { cuentas, proyectos, log } = fakes(
      [{ orgId: "o1", rol: "owner", owners: 1, miembros: 1 }],
      { o1: ["pA"] }
    );
    await eliminarCuenta({ cuentas, proyectos, storage }, { userId: "u1" });
    expect(log).toEqual(["proyecto:pA", "espacio:o1", "usuario:u1"]);
    expect(storage.files.size).toBe(0); // storage del proyecto limpiado
  });

  it("editor en un espacio ajeno: solo se va (no borra el espacio)", async () => {
    const { cuentas, proyectos, log } = fakes([{ orgId: "o1", rol: "editor", owners: 1, miembros: 3 }]);
    await eliminarCuenta({ cuentas, proyectos, storage: new FakeStorage() }, { userId: "u1" });
    expect(log).toEqual(["usuario:u1"]); // ni espacio ni proyectos
  });

  it("copropietario (hay otro owner): solo se va, el espacio sigue", async () => {
    const { cuentas, proyectos, log } = fakes([{ orgId: "o1", rol: "owner", owners: 2, miembros: 2 }]);
    await eliminarCuenta({ cuentas, proyectos, storage: new FakeStorage() }, { userId: "u1" });
    expect(log).toEqual(["usuario:u1"]);
  });

  it("único propietario con MÁS miembros: bloquea y NO borra nada", async () => {
    const { cuentas, proyectos, log } = fakes([{ orgId: "o1", rol: "owner", owners: 1, miembros: 2 }]);
    await expect(eliminarCuenta({ cuentas, proyectos, storage: new FakeStorage() }, { userId: "u1" }))
      .rejects.toThrowError(MSG_ULTIMO_OWNER_CUENTA);
    expect(log).toEqual([]); // nada tocado
  });

  it("si CUALQUIER espacio bloquea, no se borra ninguno (validación antes de ejecutar)", async () => {
    const { cuentas, proyectos, log } = fakes([
      { orgId: "o1", rol: "owner", owners: 1, miembros: 1 }, // borrable
      { orgId: "o2", rol: "owner", owners: 1, miembros: 5 }, // bloquea
    ], { o1: ["pA"] });
    await expect(eliminarCuenta({ cuentas, proyectos, storage: new FakeStorage() }, { userId: "u1" }))
      .rejects.toThrow(EditorError);
    expect(log).toEqual([]);
  });

  it("varios espacios mezclados: borra el propio, se va del compartido, y borra el usuario al final", async () => {
    const { cuentas, proyectos, log } = fakes([
      { orgId: "o1", rol: "owner", owners: 1, miembros: 1 }, // propio → borrar
      { orgId: "o2", rol: "editor", owners: 1, miembros: 4 }, // ajeno → solo irse
    ], { o1: ["pA", "pB"] });
    await eliminarCuenta({ cuentas, proyectos, storage: new FakeStorage() }, { userId: "u1" });
    expect(log).toEqual(["proyecto:pA", "proyecto:pB", "espacio:o1", "usuario:u1"]);
  });
});
