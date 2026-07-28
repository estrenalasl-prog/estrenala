import { describe, it, expect } from "vitest";
import { setEntryPath, listPages } from "@/src/projects/entry";
import type { StorageAdapter } from "@/src/storage/types";
import type { ProjectStore, ProjectRow, SnapshotRow, SnapshotInfo, CreateProjectInput, CreateSnapshotInput, AssetRow, CreateAssetInput } from "@/src/repositories/types";

const prefix = "projects/p1/snapshots/s1/";

class MapStorage implements StorageAdapter {
  constructor(private keys: string[]) {}
  async put() {}
  async get() { return null; }
  async list(p: string) { return this.keys.filter((k) => k.startsWith(p)); }
  async delete() {}
}

class StubStore implements ProjectStore {
  entryGuardado: string | null = null;
  async createProjectWithSnapshot(i: CreateProjectInput) { return { projectId: i.projectId }; }
  async getProject(): Promise<ProjectRow | null> {
    return { id: "p1", orgId: "org1", nombre: "x", entryPath: "index.html", currentSnapshotId: "s1", subdominio: null, dominio: null, publishedSnapshotId: null, noIndexar: false, createdAt: "" };
  }
  async listProjects(): Promise<ProjectRow[]> { return []; }
  async setEntryPath(_o: string, _p: string, e: string) { this.entryGuardado = e; }
  async getCurrentSnapshot(): Promise<SnapshotRow | null> {
    return { id: "s1", projectId: "p1", storagePrefix: prefix, tipo: "import" };
  }
  async createSnapshot(_input: CreateSnapshotInput): Promise<void> {}
  async setCurrentSnapshot(): Promise<void> {}
  async listSnapshots(): Promise<SnapshotInfo[]> { return []; }
  async getSnapshotById(): Promise<SnapshotRow | null> { return null; }
  assets = new Map<string, AssetRow>();
  async createAsset(i: CreateAssetInput) {
    this.assets.set(i.assetId, { id: i.assetId, projectId: i.projectId, storageKey: i.storageKey, contentType: i.contentType, bytes: i.bytes, createdAt: "" });
  }
  async getAsset(_o: string, _p: string, id: string): Promise<AssetRow | null> { return this.assets.get(id) ?? null; }
  async getPublishedSiteByHost() { return null; }
  async setNoIndexar(): Promise<void> {}
  async setPublished(): Promise<void> {}
  async subdominioLibre(): Promise<boolean> { return true; }
  async setSubdominio(): Promise<boolean> { return true; }
  async dominioLibre(): Promise<boolean> { return true; }
  async setDominio(): Promise<boolean> { return true; }
}

describe("setEntryPath / listPages", () => {
  it("listPages devuelve las páginas html del snapshot", async () => {
    const storage = new MapStorage([prefix + "index.html", prefix + "about.html", prefix + "css/app.css"]);
    const pages = await listPages({ store: new StubStore(), storage }, { orgId: "org1", projectId: "p1" });
    expect(pages.sort()).toEqual(["about.html", "index.html"]);
  });

  it("setEntryPath acepta una página existente", async () => {
    const storage = new MapStorage([prefix + "index.html", prefix + "about.html"]);
    const store = new StubStore();
    await setEntryPath({ store, storage }, { orgId: "org1", projectId: "p1", entryPath: "about.html" });
    expect(store.entryGuardado).toBe("about.html");
  });

  it("setEntryPath rechaza una página inexistente", async () => {
    const storage = new MapStorage([prefix + "index.html"]);
    const store = new StubStore();
    await expect(
      setEntryPath({ store, storage }, { orgId: "org1", projectId: "p1", entryPath: "no.html" })
    ).rejects.toThrow();
  });
});
