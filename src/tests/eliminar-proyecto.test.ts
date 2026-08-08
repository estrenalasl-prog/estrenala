import { describe, it, expect } from "vitest";
import { getTableConfig, type PgTable } from "drizzle-orm/pg-core";
import { eliminarProyecto, type BorradoProyectoStore } from "@/src/projects/eliminar";
import { TABLAS_HIJAS_DE_PROYECTO } from "@/src/repositories/projects";
import * as schema from "@/src/db/schema";
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

  /**
   * De uno en uno, una web con 19 snapshots eran más de mil peticiones seguidas:
   * ~100 s, que es donde Cloudflare corta. La base ya estaba limpia, pero la
   * respuesta no llegaba y en pantalla salía «No se pudo borrar».
   */
  it("borra por lotes cuando el storage sabe, en UNA sola llamada", async () => {
    const borradosUnoAUno: string[] = [];
    const lotes: string[][] = [];
    const claves = Array.from({ length: 300 }, (_, i) => `projects/p1/s/f${i}.txt`);
    const storage: StorageAdapter = {
      async put() {}, async get() { return null; },
      async list() { return claves; },
      async delete(k) { borradosUnoAUno.push(k); },
      async deleteMany(ks) { lotes.push(ks); },
    };
    const { store } = fakeStore(true);

    await eliminarProyecto({ store, storage }, { orgId: "o1", projectId: "p1" });

    expect(lotes).toHaveLength(1);
    expect(lotes[0]).toHaveLength(300);
    expect(borradosUnoAUno, "no debe caer al camino lento").toEqual([]);
  });

  it("si el storage no sabe borrar por lotes, sigue yendo de uno en uno", async () => {
    const storage = new FakeStorage(); // sin deleteMany
    storage.files.set("projects/p1/a.txt", Buffer.from("a"));
    storage.files.set("projects/p1/b.txt", Buffer.from("b"));
    const { store } = fakeStore(true);
    await eliminarProyecto({ store, storage }, { orgId: "o1", projectId: "p1" });
    expect(storage.files.size).toBe(0);
  });

  it("sin archivos que borrar no llama al storage para nada", async () => {
    let llamado = false;
    const storage: StorageAdapter = {
      async put() {}, async get() { return null; },
      async list() { return []; },
      async delete() { llamado = true; },
      async deleteMany() { llamado = true; },
    };
    await eliminarProyecto({ store: fakeStore(true).store, storage }, { orgId: "o1", projectId: "p1" });
    expect(llamado).toBe(false);
  });
});

/**
 * Ninguna de estas comprobaciones toca la base: leen el esquema declarado y lo
 * comparan con la lista que borra el repositorio.
 *
 * Existen porque el 08/08 una web publicada no se dejaba borrar y la pantalla
 * solo decía «Error interno». La causa era `form_submissions`, añadida cinco
 * días antes con clave ajena a `projects` y sin apuntar en el borrado: un solo
 * formulario recibido dejaba la web imborrable para siempre.
 */
describe("el borrado en cascada cubre todo lo que cuelga del proyecto", () => {
  const nombre = (t: unknown) => getTableConfig(t as PgTable).name;

  /** Las tablas que el ESQUEMA dice que apuntan a `projects.id`. */
  function hijasSegunElEsquema(): string[] {
    const hijas: string[] = [];
    for (const tabla of Object.values(schema)) {
      let cfg;
      try { cfg = getTableConfig(tabla as PgTable); } catch { continue; } // no es una tabla
      if (!cfg?.columns?.length || cfg.name === "projects") continue;
      const apunta = cfg.foreignKeys.some((fk) => nombre(fk.reference().foreignTable) === "projects");
      if (apunta) hijas.push(cfg.name);
    }
    return hijas.sort();
  }

  it("la lista del repositorio es EXACTAMENTE la del esquema", () => {
    const enElEsquema = hijasSegunElEsquema();
    // Si esto es 0 el test no está mirando nada, que es como se cuelan los bugs.
    expect(enElEsquema.length, "no se ha encontrado ninguna tabla hija").toBeGreaterThan(5);
    expect(
      TABLAS_HIJAS_DE_PROYECTO.map(nombre).sort(),
      "añade la tabla que falta a TABLAS_HIJAS_DE_PROYECTO o el borrado dará «Error interno»"
    ).toEqual(enElEsquema);
  });

  it("`form_submissions` está: un formulario recibido no puede impedir borrar la web", () => {
    expect(TABLAS_HIJAS_DE_PROYECTO.map(nombre)).toContain("form_submissions");
  });

  it("el proyecto se borra el ÚLTIMO, nunca antes que sus hijos", () => {
    expect(TABLAS_HIJAS_DE_PROYECTO.map(nombre)).not.toContain("projects");
  });
});
