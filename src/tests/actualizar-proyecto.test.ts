import { describe, it, expect } from "vitest";
import { zipSync, strToU8 } from "fflate";
import { actualizarProyecto } from "@/src/projects/actualizar";
import { EditorError } from "@/src/editor/errors";
import { ImportError } from "@/src/import/unzip";
import type { StorageAdapter } from "@/src/storage/types";
import type {
  ProjectStore, ProjectRow, SnapshotRow, SnapshotInfo, CreateProjectInput, CreateSnapshotInput,
  AssetRow, CreateAssetInput,
} from "@/src/repositories/types";

const CUR = "projects/p1/snapshots/s0/";

class FakeStorage implements StorageAdapter {
  files = new Map<string, Buffer>();
  async put(k: string, b: Buffer | string) { this.files.set(k, Buffer.isBuffer(b) ? b : Buffer.from(b)); }
  async get(k: string) { const b = this.files.get(k); return b ? { body: b, contentType: "x" } : null; }
  async list(prefix: string) { return [...this.files.keys()].filter((k) => k.startsWith(prefix)); }
  async delete(k: string) { this.files.delete(k); }
}

class FakeStore implements ProjectStore {
  creado: CreateSnapshotInput | null = null;
  actualFijado: string | null = null;
  entryFijado: string | null = null;
  entryPath = "index.html";
  async createProjectWithSnapshot(i: CreateProjectInput) { return { projectId: i.projectId }; }
  async getProject(): Promise<ProjectRow | null> {
    return { id: "p1", orgId: "org1", nombre: "x", entryPath: this.entryPath, currentSnapshotId: "s0", subdominio: "mi-web", dominio: null, publishedSnapshotId: null, createdAt: "" };
  }
  async listProjects(): Promise<ProjectRow[]> { return []; }
  async setEntryPath(_o: string, _p: string, e: string) { this.entryFijado = e; }
  async getCurrentSnapshot(): Promise<SnapshotRow | null> {
    return { id: "s0", projectId: "p1", storagePrefix: CUR, tipo: "import" };
  }
  async createSnapshot(i: CreateSnapshotInput) { this.creado = i; }
  async setCurrentSnapshot(_o: string, _p: string, id: string) { this.actualFijado = id; }
  async listSnapshots(): Promise<SnapshotInfo[]> { return []; }
  async getSnapshotById(): Promise<SnapshotRow | null> { return null; }
  async createAsset(_i: CreateAssetInput): Promise<void> {}
  async getAsset(): Promise<AssetRow | null> { return null; }
  async getPublishedSiteByHost(): Promise<{ entryPath: string; storagePrefix: string } | null> { return null; }
  async setPublished(): Promise<void> {}
  async subdominioLibre(): Promise<boolean> { return true; }
  async setSubdominio(): Promise<boolean> { return true; }
  async dominioLibre(): Promise<boolean> { return true; }
  async setDominio(): Promise<boolean> { return true; }
}

const zipDe = (paginas: Record<string, string>) =>
  Buffer.from(zipSync(Object.fromEntries(Object.entries(paginas).map(([k, v]) => [k, strToU8(v)]))));

describe("actualizarProyecto", () => {
  it("crea un snapshot nuevo con el ZIP, lo deja como actual y NO copia el anterior", async () => {
    const storage = new FakeStorage();
    storage.files.set(CUR + "index.html", Buffer.from("<h1>Vieja</h1>"));
    const store = new FakeStore();

    const { snapshotId } = await actualizarProyecto({ store, storage }, {
      orgId: "org1", projectId: "p1", zip: zipDe({ "index.html": "<h1>Nueva versión</h1>" }),
    });

    const np = `projects/p1/snapshots/${snapshotId}/`;
    expect(storage.files.get(np + "index.html")!.toString()).toBe("<h1>Nueva versión</h1>");
    expect(store.creado).toMatchObject({ projectId: "p1", parentId: "s0", tipo: "actualizacion" });
    expect(store.actualFijado).toBe(snapshotId);
    // el snapshot viejo sigue intacto (Historial → revertir)
    expect(storage.files.get(CUR + "index.html")!.toString()).toBe("<h1>Vieja</h1>");
  });

  it("ajusta la página de entrada si el ZIP nuevo la cambia", async () => {
    const storage = new FakeStorage();
    const store = new FakeStore();
    store.entryPath = "index.html";
    // ZIP sin index.html: la entrada pasa a ser home.html
    await actualizarProyecto({ store, storage }, {
      orgId: "org1", projectId: "p1", zip: zipDe({ "home.html": "<h1>Home</h1>" }),
    });
    expect(store.entryFijado).toBe("home.html");
  });

  it("no toca la entrada si sigue siendo la misma", async () => {
    const storage = new FakeStorage();
    const store = new FakeStore();
    await actualizarProyecto({ store, storage }, {
      orgId: "org1", projectId: "p1", zip: zipDe({ "index.html": "<h1>x</h1>" }),
    });
    expect(store.entryFijado).toBeNull();
  });

  it("404 si el proyecto no existe", async () => {
    class NoProject extends FakeStore { async getProject() { return null; } }
    await expect(actualizarProyecto({ store: new NoProject(), storage: new FakeStorage() }, {
      orgId: "org1", projectId: "p1", zip: zipDe({ "index.html": "<h1>x</h1>" }),
    })).rejects.toThrow(EditorError);
  });

  it("ZIP inválido → ImportError (y no crea snapshot)", async () => {
    const store = new FakeStore();
    await expect(actualizarProyecto({ store, storage: new FakeStorage() }, {
      orgId: "org1", projectId: "p1", zip: Buffer.from("esto no es un zip"),
    })).rejects.toThrow(ImportError);
    expect(store.creado).toBeNull();
  });

  it("si createSnapshot falla, limpia el storage escrito", async () => {
    class FallaStore extends FakeStore { async createSnapshot() { throw new Error("boom"); } }
    const storage = new FakeStorage();
    await expect(actualizarProyecto({ store: new FallaStore(), storage }, {
      orgId: "org1", projectId: "p1", zip: zipDe({ "index.html": "<h1>x</h1>" }),
    })).rejects.toThrow("boom");
    const huerfanos = [...storage.files.keys()].filter((k) => k.startsWith("projects/p1/snapshots/") && !k.startsWith(CUR));
    expect(huerfanos).toEqual([]);
  });
});
