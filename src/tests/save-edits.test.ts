import { describe, it, expect } from "vitest";
import { saveEdits } from "@/src/editor/save-edits";
import { EditorError } from "@/src/editor/errors";
import type { StorageAdapter } from "@/src/storage/types";
import type {
  ProjectStore, ProjectRow, SnapshotRow, SnapshotInfo, CreateProjectInput, CreateSnapshotInput,
  AssetRow, CreateAssetInput,
} from "@/src/repositories/types";

const CUR = "projects/p1/snapshots/s0/";

class FakeStorage implements StorageAdapter {
  files = new Map<string, Buffer>();
  async put(key: string, body: Buffer | string) { this.files.set(key, Buffer.isBuffer(body) ? body : Buffer.from(body)); }
  async get(key: string) { const b = this.files.get(key); return b ? { body: b, contentType: "x" } : null; }
  async list(prefix: string) { return [...this.files.keys()].filter((k) => k.startsWith(prefix)); }
  async delete(key: string) { this.files.delete(key); }
}

class FakeStore implements ProjectStore {
  creado: CreateSnapshotInput | null = null;
  actualFijado: string | null = null;
  async createProjectWithSnapshot(i: CreateProjectInput) { return { projectId: i.projectId }; }
  async getProject(): Promise<ProjectRow | null> {
    return { id: "p1", orgId: "org1", nombre: "x", entryPath: "index.html", currentSnapshotId: "s0", subdominio: null, dominio: null, publishedSnapshotId: null, createdAt: "" };
  }
  async listProjects(): Promise<ProjectRow[]> { return []; }
  async setEntryPath(): Promise<void> {}
  async getCurrentSnapshot(): Promise<SnapshotRow | null> {
    return { id: "s0", projectId: "p1", storagePrefix: CUR, tipo: "import" };
  }
  async createSnapshot(i: CreateSnapshotInput) { this.creado = i; }
  async setCurrentSnapshot(_o: string, _p: string, id: string) { this.actualFijado = id; }
  async listSnapshots(): Promise<SnapshotInfo[]> { return []; }
  async getSnapshotById(): Promise<SnapshotRow | null> { return null; }
  assets = new Map<string, AssetRow>();
  async createAsset(i: CreateAssetInput) {
    this.assets.set(i.assetId, {
      id: i.assetId, projectId: i.projectId, storageKey: i.storageKey,
      contentType: i.contentType, bytes: i.bytes, createdAt: "",
    });
  }
  async getAsset(_o: string, _p: string, id: string): Promise<AssetRow | null> {
    return this.assets.get(id) ?? null;
  }
  async getPublishedSiteByHost(): Promise<{ entryPath: string; storagePrefix: string } | null> { return null; }
  async setPublished(): Promise<void> {}
  async subdominioLibre(): Promise<boolean> { return true; }
  async setSubdominio(): Promise<boolean> { return true; }
  async dominioLibre(): Promise<boolean> { return true; }
  async setDominio(): Promise<boolean> { return true; }
}

describe("saveEdits", () => {
  it("copia el árbol, aplica la edición a la página y crea un snapshot edit", async () => {
    const storage = new FakeStorage();
    storage.files.set(CUR + "index.html", Buffer.from(`<h1>Hola</h1>`));
    storage.files.set(CUR + "css/app.css", Buffer.from(`body{}`));
    const store = new FakeStore();

    const { snapshotId } = await saveEdits({ store, storage }, {
      orgId: "org1", projectId: "p1",
      ops: [{ page: "index.html", nodeId: 0, kind: "text", value: "Adiós" }],
    });

    const newPrefix = `projects/p1/snapshots/${snapshotId}/`;
    expect(storage.files.get(newPrefix + "index.html")!.toString()).toBe(`<h1>Adiós</h1>`);
    expect(storage.files.get(newPrefix + "css/app.css")!.toString()).toBe(`body{}`); // copiado tal cual
    expect(store.creado!.parentId).toBe("s0");
    expect(store.creado!.tipo).toBe("edit");
    expect(store.actualFijado).toBe(snapshotId);
  });

  it("lanza 400 si no hay ninguna op válida", async () => {
    const storage = new FakeStorage();
    storage.files.set(CUR + "index.html", Buffer.from(`<h1>x</h1>`));
    await expect(
      saveEdits({ store: new FakeStore(), storage }, { orgId: "org1", projectId: "p1", ops: [] })
    ).rejects.toThrow(EditorError);
  });

  it("rechaza más de 1000 ops con 400", async () => {
    const storage = new FakeStorage();
    storage.files.set(CUR + "index.html", Buffer.from(`<h1>x</h1>`));
    const ops = Array.from({ length: 1001 }, (_, i) => ({ page: "index.html", nodeId: i, kind: "text" as const, value: "x" }));
    await expect(saveEdits({ store: new FakeStore(), storage }, { orgId: "org1", projectId: "p1", ops }))
      .rejects.toThrow(EditorError);
  });

  it("rechaza un value demasiado largo con 400", async () => {
    const storage = new FakeStorage();
    storage.files.set(CUR + "index.html", Buffer.from(`<h1>x</h1>`));
    const ops = [{ page: "index.html", nodeId: 0, kind: "text" as const, value: "a".repeat(50001) }];
    await expect(saveEdits({ store: new FakeStore(), storage }, { orgId: "org1", projectId: "p1", ops }))
      .rejects.toThrow(EditorError);
  });

  it("lanza 404 si el proyecto no existe", async () => {
    const storage = new FakeStorage();
    class NoProjectStore extends FakeStore { async getProject() { return null; } }
    await expect(
      saveEdits({ store: new NoProjectStore(), storage }, { orgId: "org1", projectId: "p1", ops: [{ page: "index.html", nodeId: 0, kind: "text", value: "x" }] })
    ).rejects.toThrow(EditorError);
  });

  it("ignora ops de kind no-text → 400 si no queda ninguna válida", async () => {
    const storage = new FakeStorage();
    storage.files.set(CUR + "index.html", Buffer.from(`<h1>x</h1>`));
    await expect(
      saveEdits({ store: new FakeStore(), storage }, { orgId: "org1", projectId: "p1", ops: [{ page: "index.html", nodeId: 0, kind: "imagen" as unknown as "text", value: "x" }] })
    ).rejects.toThrow(EditorError);
  });

  it("aplica href/color y copia el asset de imagen a wc-uploads/", async () => {
    const storage = new FakeStorage();
    storage.files.set(CUR + "index.html", Buffer.from(`<a href="/o">x</a><img src="/a.png"><p>t</p>`));
    storage.files.set("projects/p1/assets/aa.png", Buffer.from("PNGDATA"));
    const store = new FakeStore();
    store.assets.set("11111111-2222-4333-8444-555555555555", {
      id: "11111111-2222-4333-8444-555555555555", projectId: "p1",
      storageKey: "projects/p1/assets/aa.png", contentType: "image/png", bytes: 7, createdAt: "",
    });
    const A = "11111111-2222-4333-8444-555555555555";

    const { snapshotId } = await saveEdits({ store, storage }, {
      orgId: "org1", projectId: "p1",
      ops: [
        { page: "index.html", nodeId: 0, kind: "href", value: "/n" },
        { page: "index.html", nodeId: 1, kind: "src", value: `/wc-uploads/${A}.png`, assetId: A },
        { page: "index.html", nodeId: 2, kind: "style", property: "color", value: "red" },
      ],
    });

    const np = `projects/p1/snapshots/${snapshotId}/`;
    const html = storage.files.get(np + "index.html")!.toString();
    expect(html).toBe(`<a href="/n">x</a><img src="/wc-uploads/${A}.png"><p style="color: red">t</p>`);
    expect(storage.files.get(np + `wc-uploads/${A}.png`)!.toString()).toBe("PNGDATA");
  });

  it("ignora una op src cuyo assetId no existe (no rompe el guardado)", async () => {
    const storage = new FakeStorage();
    storage.files.set(CUR + "index.html", Buffer.from(`<a href="/o">x</a>`));
    const A = "11111111-2222-4333-8444-555555555555";
    const { snapshotId } = await saveEdits({ store: new FakeStore(), storage }, {
      orgId: "org1", projectId: "p1",
      ops: [
        { page: "index.html", nodeId: 0, kind: "href", value: "/n" },
        { page: "index.html", nodeId: 9, kind: "src", value: `/wc-uploads/${A}.png`, assetId: A },
      ],
    });
    const np = `projects/p1/snapshots/${snapshotId}/`;
    expect(storage.files.get(np + "index.html")!.toString()).toBe(`<a href="/n">x</a>`);
    expect(storage.files.get(np + `wc-uploads/${A}.png`)).toBeUndefined();
  });

  it("rechaza una href insegura → 400 si no queda ninguna válida", async () => {
    const storage = new FakeStorage();
    storage.files.set(CUR + "index.html", Buffer.from(`<a href="/o">x</a>`));
    await expect(saveEdits({ store: new FakeStore(), storage }, {
      orgId: "org1", projectId: "p1",
      ops: [{ page: "index.html", nodeId: 0, kind: "href", value: "javascript:alert(1)" }],
    })).rejects.toThrow(EditorError);
  });

  it("limpia el prefijo nuevo si createSnapshot falla", async () => {
    const storage = new FakeStorage();
    storage.files.set(CUR + "index.html", Buffer.from(`<a href="/o">x</a>`));
    class FallaStore extends FakeStore { async createSnapshot() { throw new Error("boom"); } }
    await expect(saveEdits({ store: new FallaStore(), storage }, {
      orgId: "org1", projectId: "p1",
      ops: [{ page: "index.html", nodeId: 0, kind: "href", value: "/n" }],
    })).rejects.toThrow("boom");
    const huerfanos = [...storage.files.keys()].filter((k) => k.startsWith("projects/p1/snapshots/") && !k.startsWith(CUR));
    expect(huerfanos).toEqual([]);
    expect(storage.files.has(CUR + "index.html")).toBe(true); // el snapshot original queda intacto
  });

  it("ignora la op src si el asset existe en BD pero falta el fichero en storage", async () => {
    const storage = new FakeStorage();
    storage.files.set(CUR + "index.html", Buffer.from(`<img src="/a.png"><a href="/o">x</a>`));
    const store = new FakeStore();
    const A = "11111111-2222-4333-8444-555555555555";
    store.assets.set(A, { id: A, projectId: "p1", storageKey: "projects/p1/assets/aa.png", contentType: "image/png", bytes: 7, createdAt: "" });
    // adrede: NO añadimos el fichero projects/p1/assets/aa.png al storage
    const { snapshotId } = await saveEdits({ store, storage }, {
      orgId: "org1", projectId: "p1",
      ops: [
        { page: "index.html", nodeId: 0, kind: "src", value: `/wc-uploads/${A}.png`, assetId: A },
        { page: "index.html", nodeId: 1, kind: "href", value: "/n" },
      ],
    });
    const np = `projects/p1/snapshots/${snapshotId}/`;
    expect(storage.files.get(np + "index.html")!.toString()).toBe(`<img src="/a.png"><a href="/n">x</a>`);
    expect(storage.files.get(np + `wc-uploads/${A}.png`)).toBeUndefined();
  });
});
