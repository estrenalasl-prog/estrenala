import { describe, it, expect } from "vitest";
import { previsualizarEdicion } from "@/src/editor/preview-edits";
import type { ProjectStore, ProjectRow, SnapshotRow } from "@/src/repositories/types";
import type { StorageAdapter } from "@/src/storage/types";

const PREFIX = "p/s1/";

function entorno(archivos: Record<string, string>) {
  const store = {
    async getProject(): Promise<ProjectRow> {
      return {
        id: "p1", orgId: "o1", nombre: "x", entryPath: "index.html", currentSnapshotId: "s1",
        subdominio: null, dominio: null, publishedSnapshotId: null, noIndexar: false, createdAt: "",
      };
    },
    async getCurrentSnapshot(): Promise<SnapshotRow> {
      return { id: "s1", projectId: "p1", storagePrefix: PREFIX, tipo: "edit" };
    },
  } as unknown as ProjectStore;
  const leidas: string[] = [];
  const escrituras: string[] = [];
  const storage = {
    async get(key: string) {
      leidas.push(key);
      const v = archivos[key.slice(PREFIX.length)];
      return v === undefined ? null : { body: Buffer.from(v, "utf-8"), contentType: "text/html" };
    },
    async put(key: string) { escrituras.push(key); },
  } as unknown as StorageAdapter;
  return { store, storage, escrituras };
}

describe("previsualizarEdicion", () => {
  it("enseña la página con el cambio puesto", async () => {
    const { store, storage } = entorno({ "index.html": "<h1>Hola</h1>" });
    const { html } = await previsualizarEdicion({ store, storage }, {
      orgId: "o1", projectId: "p1", page: "index.html",
      ops: [{ page: "index.html", nodeId: 0, kind: "text", value: "Adiós" }],
    });
    expect(html).toContain("Adiós");
    expect(html).not.toContain("Hola");
  });

  it("NO guarda nada: es una vista previa", async () => {
    const { store, storage, escrituras } = entorno({ "index.html": "<h1>Hola</h1>" });
    await previsualizarEdicion({ store, storage }, {
      orgId: "o1", projectId: "p1", page: "index.html",
      ops: [{ page: "index.html", nodeId: 0, kind: "text", value: "Adiós" }],
    });
    expect(escrituras).toEqual([]);
  });

  // Sin esto se vería sin estilos ni imágenes, que es justo lo que se quiere mirar.
  it("reapunta los recursos a la ruta de vista previa", async () => {
    const { store, storage } = entorno({
      "index.html": '<html><head><link rel="stylesheet" href="/css/app.css"></head><body><h1>Hola</h1></body></html>',
    });
    const { html } = await previsualizarEdicion({ store, storage }, {
      orgId: "o1", projectId: "p1", page: "index.html", ops: [],
    });
    expect(html).toContain('href="/api/projects/p1/preview/css/app.css"');
    expect(html).toContain('<base href="/api/projects/p1/preview/">');
  });

  it("ignora los cambios de otra página", async () => {
    const { store, storage } = entorno({ "index.html": "<h1>Hola</h1>" });
    const { html } = await previsualizarEdicion({ store, storage }, {
      orgId: "o1", projectId: "p1", page: "index.html",
      ops: [{ page: "otra.html", nodeId: 0, kind: "text", value: "Adiós" }],
    });
    expect(html).toContain("Hola");
  });

  it("una página que no existe no revienta con un error feo", async () => {
    const { store, storage } = entorno({ "index.html": "<h1>Hola</h1>" });
    await expect(previsualizarEdicion({ store, storage }, {
      orgId: "o1", projectId: "p1", page: "noexiste.html", ops: [],
    })).rejects.toThrow("Página no encontrada");
  });

  it("no se sale del proyecto por la ruta", async () => {
    const { store, storage } = entorno({ "index.html": "<h1>Hola</h1>" });
    await expect(previsualizarEdicion({ store, storage }, {
      orgId: "o1", projectId: "p1", page: "../../secreto", ops: [],
    })).rejects.toThrow("Ruta no válida");
    await expect(previsualizarEdicion({ store, storage }, {
      orgId: "o1", projectId: "p1", page: "/etc/passwd", ops: [],
    })).rejects.toThrow("Ruta no válida");
  });
});
