import { describe, it, expect } from "vitest";
import { eliminarProyecto, type BorradoProyectoStore } from "@/src/projects/eliminar";
import { EditorError } from "@/src/editor/errors";
import type { StorageAdapter } from "@/src/storage/types";

class FakeStorage implements StorageAdapter {
  files = new Map<string, Buffer>();
  async put(k: string, b: Buffer | string) { this.files.set(k, Buffer.isBuffer(b) ? b : Buffer.from(b)); }
  async get(k: string) { const b = this.files.get(k); return b ? { body: b, contentType: "x" } : null; }
  async list(prefix: string) { return [...this.files.keys()].filter((k) => k.startsWith(prefix)); }
  async delete(k: string) { this.files.delete(k); }
}

function fakeStore(existe: boolean) {
  const llamadas: string[] = [];
  const store: BorradoProyectoStore = {
    async getProject(_o, id) { return existe ? { id } : null; },
    async deleteProjectCascade(_o, id) { llamadas.push(`cascade:${id}`); },
  };
  return { store, llamadas };
}

describe("eliminarProyecto", () => {
  it("404 si el proyecto no existe (y no toca storage ni BD)", async () => {
    const storage = new FakeStorage();
    storage.files.set("projects/p1/snapshots/s0/index.html", Buffer.from("x"));
    const { store, llamadas } = fakeStore(false);
    await expect(eliminarProyecto({ store, storage }, { orgId: "o1", projectId: "p1" }))
      .rejects.toThrow(EditorError);
    expect(llamadas).toEqual([]);
    expect(storage.files.size).toBe(1); // intacto
  });

  it("borra las filas (cascade) y TODO el storage del proyecto", async () => {
    const storage = new FakeStorage();
    storage.files.set("projects/p1/snapshots/s0/index.html", Buffer.from("x"));
    storage.files.set("projects/p1/snapshots/s1/index.html", Buffer.from("y"));
    storage.files.set("projects/p1/assets/a.png", Buffer.from("z"));
    storage.files.set("projects/OTRO/snapshots/s0/index.html", Buffer.from("w")); // de otro proyecto
    const { store, llamadas } = fakeStore(true);

    await eliminarProyecto({ store, storage }, { orgId: "o1", projectId: "p1" });

    expect(llamadas).toEqual(["cascade:p1"]);
    expect([...storage.files.keys()]).toEqual(["projects/OTRO/snapshots/s0/index.html"]);
  });

  it("borra la BD ANTES que el storage (si el storage falla, la BD ya se limpió)", async () => {
    const orden: string[] = [];
    const store: BorradoProyectoStore = {
      async getProject(_o, id) { return { id }; },
      async deleteProjectCascade() { orden.push("bd"); },
    };
    const storage: StorageAdapter = {
      async put() {}, async get() { return null; },
      async list() { orden.push("storage"); throw new Error("storage caído"); },
      async delete() {},
    };
    // El fallo de storage NO propaga: el borrado se considera hecho (BD limpia).
    await expect(eliminarProyecto({ store, storage }, { orgId: "o1", projectId: "p1" })).resolves.toBeUndefined();
    expect(orden).toEqual(["bd", "storage"]);
  });
});
