import { describe, it, expect } from "vitest";
import { zipSync, strToU8 } from "fflate";
import { importProject } from "@/src/import/import-project";
import type { StorageAdapter } from "@/src/storage/types";
import type { ProjectStore, CreateProjectInput, CreateSnapshotInput, ProjectRow, SnapshotRow, SnapshotInfo, AssetRow, CreateAssetInput } from "@/src/repositories/types";

function makeZip(files: Record<string, string>): Buffer {
  const data: Record<string, Uint8Array> = {};
  for (const [k, v] of Object.entries(files)) data[k] = strToU8(v);
  return Buffer.from(zipSync(data));
}

class FakeStorage implements StorageAdapter {
  puestos = new Map<string, Buffer>();
  async put(key: string, body: Buffer | string) {
    this.puestos.set(key, Buffer.isBuffer(body) ? body : Buffer.from(body));
  }
  async get(key: string) {
    const b = this.puestos.get(key);
    return b ? { body: b, contentType: "x" } : null;
  }
  async list(prefix: string) {
    return [...this.puestos.keys()].filter((k) => k.startsWith(prefix));
  }
  async delete(key: string) { this.puestos.delete(key); }
}

class FakeStore implements ProjectStore {
  creado: CreateProjectInput | null = null;
  async createProjectWithSnapshot(input: CreateProjectInput) {
    this.creado = input;
    return { projectId: input.projectId };
  }
  async getProject(): Promise<ProjectRow | null> { return null; }
  async listProjects(): Promise<ProjectRow[]> { return []; }
  async setEntryPath(): Promise<void> {}
  async getCurrentSnapshot(): Promise<SnapshotRow | null> { return null; }
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

describe("importProject", () => {
  it("escribe los archivos al storage bajo el prefijo del snapshot y crea el proyecto", async () => {
    const storage = new FakeStorage();
    const store = new FakeStore();
    const zip = makeZip({ "index.html": "<h1>Hola</h1>", "css/app.css": "body{}" });

    const { projectId } = await importProject({ store, storage, orgId: "org1" }, { zip, nombre: "Mi web" });

    expect(projectId).toBe(store.creado!.projectId);
    expect(store.creado!.entryPath).toBe("index.html");
    expect(store.creado!.nombre).toBe("Mi web");
    const prefix = store.creado!.storagePrefix;
    expect(storage.puestos.get(prefix + "index.html")!.toString()).toBe("<h1>Hola</h1>");
    expect(storage.puestos.get(prefix + "css/app.css")!.toString()).toBe("body{}");
  });

  it("usa un nombre por defecto si no se da", async () => {
    const storage = new FakeStorage();
    const store = new FakeStore();
    const zip = makeZip({ "index.html": "x" });
    await importProject({ store, storage, orgId: "org1" }, { zip });
    expect(store.creado!.nombre.length).toBeGreaterThan(0);
  });
});
