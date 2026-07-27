import { describe, it, expect } from "vitest";
import { uploadAsset } from "@/src/editor/assets";
import { EditorError } from "@/src/editor/errors";
import type { StorageAdapter } from "@/src/storage/types";
import type {
  ProjectStore, ProjectRow, SnapshotRow, SnapshotInfo,
  CreateProjectInput, CreateSnapshotInput, AssetRow, CreateAssetInput,
} from "@/src/repositories/types";

class FakeStorage implements StorageAdapter {
  files = new Map<string, Buffer>();
  async put(key: string, body: Buffer | string) { this.files.set(key, Buffer.isBuffer(body) ? body : Buffer.from(body)); }
  async get(key: string) { const b = this.files.get(key); return b ? { body: b, contentType: "x" } : null; }
  async list(prefix: string) { return [...this.files.keys()].filter((k) => k.startsWith(prefix)); }
  async delete(key: string) { this.files.delete(key); }
}
class FakeStore implements ProjectStore {
  assets = new Map<string, AssetRow>();
  hayProyecto = true;
  async createProjectWithSnapshot(i: CreateProjectInput) { return { projectId: i.projectId }; }
  async getProject(): Promise<ProjectRow | null> {
    return this.hayProyecto ? { id: "p1", orgId: "org1", nombre: "x", entryPath: "i.html", currentSnapshotId: "s0", subdominio: null, dominio: null, publishedSnapshotId: null, createdAt: "" } : null;
  }
  async listProjects(): Promise<ProjectRow[]> { return []; }
  async setEntryPath(): Promise<void> {}
  async getCurrentSnapshot(): Promise<SnapshotRow | null> { return null; }
  async createSnapshot(_i: CreateSnapshotInput) {}
  async setCurrentSnapshot(): Promise<void> {}
  async listSnapshots(): Promise<SnapshotInfo[]> { return []; }
  async getSnapshotById(): Promise<SnapshotRow | null> { return null; }
  async createAsset(i: CreateAssetInput) {
    this.assets.set(i.assetId, { id: i.assetId, projectId: i.projectId, storageKey: i.storageKey, contentType: i.contentType, bytes: i.bytes, createdAt: "" });
  }
  async getAsset(_o: string, _p: string, id: string): Promise<AssetRow | null> { return this.assets.get(id) ?? null; }
  async getPublishedSiteByHost(): Promise<{ entryPath: string; storagePrefix: string; plan: string } | null> { return null; }
  async setPublished(): Promise<void> {}
  async subdominioLibre(): Promise<boolean> { return true; }
  async setSubdominio(): Promise<boolean> { return true; }
  async dominioLibre(): Promise<boolean> { return true; }
  async setDominio(): Promise<boolean> { return true; }
}

describe("uploadAsset", () => {
  it("guarda la imagen, crea el Asset y devuelve url", async () => {
    const storage = new FakeStorage();
    const store = new FakeStore();
    const r = await uploadAsset({ store, storage }, {
      orgId: "org1", projectId: "p1", filename: "logo.PNG", bytes: Buffer.from([1, 2, 3]),
    });
    expect(r.ext).toBe("png");
    expect(r.url).toBe(`/api/projects/p1/assets/${r.assetId}.png`);
    expect(storage.files.get(`projects/p1/assets/${r.assetId}.png`)).toBeTruthy();
    expect(store.assets.get(r.assetId)!.contentType).toBe("image/png");
    expect(store.assets.get(r.assetId)!.bytes).toBe(3);
  });

  it("rechaza extensión no permitida con 400", async () => {
    await expect(uploadAsset({ store: new FakeStore(), storage: new FakeStorage() }, {
      orgId: "org1", projectId: "p1", filename: "x.exe", bytes: Buffer.from([1]),
    })).rejects.toThrow(EditorError);
  });

  it("rechaza archivo vacío y > 10MB con 400", async () => {
    await expect(uploadAsset({ store: new FakeStore(), storage: new FakeStorage() }, {
      orgId: "org1", projectId: "p1", filename: "x.png", bytes: Buffer.alloc(0),
    })).rejects.toThrow(EditorError);
    await expect(uploadAsset({ store: new FakeStore(), storage: new FakeStorage() }, {
      orgId: "org1", projectId: "p1", filename: "x.png", bytes: Buffer.alloc(10 * 1024 * 1024 + 1),
    })).rejects.toThrow(EditorError);
  });

  it("rechaza si el proyecto no existe (404)", async () => {
    const store = new FakeStore(); store.hayProyecto = false;
    await expect(uploadAsset({ store, storage: new FakeStorage() }, {
      orgId: "org1", projectId: "p1", filename: "x.png", bytes: Buffer.from([1]),
    })).rejects.toThrow(EditorError);
  });
});
