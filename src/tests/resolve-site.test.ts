import { describe, it, expect } from "vitest";
import { resolvePublicSite } from "@/src/publish/resolve-site";
import type { StorageAdapter } from "@/src/storage/types";
import type {
  ProjectStore, ProjectRow, SnapshotRow, SnapshotInfo,
  CreateProjectInput, CreateSnapshotInput, AssetRow, CreateAssetInput,
} from "@/src/repositories/types";

const PLAT = "localhost:3000";
const PREFIX = "projects/p1/snapshots/s1/";
const HTML = `<!doctype html><html><head><title>t</title></head><body><h1>Hola</h1></body></html>`;

class FakeStorage implements StorageAdapter {
  files = new Map<string, Buffer>();
  async put(key: string, body: Buffer | string) { this.files.set(key, Buffer.isBuffer(body) ? body : Buffer.from(body)); }
  async get(key: string) {
    const b = this.files.get(key);
    return b ? { body: b, contentType: key.endsWith(".css") ? "text/css; charset=utf-8" : "text/html; charset=utf-8" } : null;
  }
  async list(prefix: string) { return [...this.files.keys()].filter((k) => k.startsWith(prefix)); }
  async delete(key: string) { this.files.delete(key); }
}

class FakeStore implements ProjectStore {
  sitios = new Map<string, { entryPath: string; storagePrefix: string }>(); // clave: "sub:x" | "dom:x"
  async createProjectWithSnapshot(i: CreateProjectInput) { return { projectId: i.projectId }; }
  async getProject(): Promise<ProjectRow | null> { return null; }
  async listProjects(): Promise<ProjectRow[]> { return []; }
  async setEntryPath(): Promise<void> {}
  async getCurrentSnapshot(): Promise<SnapshotRow | null> { return null; }
  async createSnapshot(_i: CreateSnapshotInput) {}
  async setCurrentSnapshot(): Promise<void> {}
  async listSnapshots(): Promise<SnapshotInfo[]> { return []; }
  async getSnapshotById(): Promise<SnapshotRow | null> { return null; }
  async createAsset(_i: CreateAssetInput) {}
  async getAsset(): Promise<AssetRow | null> { return null; }
  async getPublishedSiteByHost(q: { subdominio: string } | { dominio: string }) {
    const clave = "subdominio" in q ? `sub:${q.subdominio}` : `dom:${q.dominio}`;
    return this.sitios.get(clave) ?? null;
  }
  async setPublished(): Promise<void> {}
  async subdominioLibre(): Promise<boolean> { return true; }
  async setSubdominio(): Promise<boolean> { return true; }
}

function preparado() {
  const storage = new FakeStorage();
  storage.files.set(PREFIX + "index.html", Buffer.from(HTML));
  storage.files.set(PREFIX + "css/app.css", Buffer.from("body{}"));
  const store = new FakeStore();
  store.sitios.set("sub:cafe", { entryPath: "index.html", storagePrefix: PREFIX });
  store.sitios.set("dom:quantivatechnology.com", { entryPath: "index.html", storagePrefix: PREFIX });
  return { storage, store };
}

describe("resolvePublicSite", () => {
  it("sirve el entryPath en '/' byte-idéntico (sin <base>, sin data-wc-id) y no-cache", async () => {
    const { storage, store } = preparado();
    const r = await resolvePublicSite({ store, storage }, { host: "cafe.localhost:3000", platformHost: PLAT, pathSegments: [] });
    expect(r.status).toBe(200);
    expect(r.body.toString()).toBe(HTML);
    expect(r.body.toString()).not.toContain("<base");
    expect(r.cacheControl).toBe("no-cache");
  });

  it("sirve un asset con cache pública", async () => {
    const { storage, store } = preparado();
    const r = await resolvePublicSite({ store, storage }, { host: "cafe.localhost:3000", platformHost: PLAT, pathSegments: ["css", "app.css"] });
    expect(r.status).toBe(200);
    expect(r.contentType).toContain("text/css");
    expect(r.cacheControl).toBe("public, max-age=300");
  });

  it("resuelve por dominio propio", async () => {
    const { storage, store } = preparado();
    const r = await resolvePublicSite({ store, storage }, { host: "quantivatechnology.com", platformHost: PLAT, pathSegments: [] });
    expect(r.status).toBe(200);
  });

  it("host sin proyecto publicado → 404 'Esta web no está publicada'", async () => {
    const { storage, store } = preparado();
    const r = await resolvePublicSite({ store, storage }, { host: "nadie.localhost:3000", platformHost: PLAT, pathSegments: [] });
    expect(r.status).toBe(404);
    expect(r.body.toString()).toContain("Esta web no está publicada");
  });

  it("host de plataforma o desconocido → 404", async () => {
    const { storage, store } = preparado();
    const a = await resolvePublicSite({ store, storage }, { host: "localhost:3000", platformHost: PLAT, pathSegments: [] });
    const b = await resolvePublicSite({ store, storage }, { host: "a.b.localhost:3000", platformHost: PLAT, pathSegments: [] });
    expect(a.status).toBe(404);
    expect(b.status).toBe(404);
  });

  it("traversal → 400", async () => {
    const { storage, store } = preparado();
    const r = await resolvePublicSite({ store, storage }, { host: "cafe.localhost:3000", platformHost: PLAT, pathSegments: [".."] });
    expect(r.status).toBe(400);
  });

  it("archivo inexistente dentro del sitio → 404", async () => {
    const { storage, store } = preparado();
    const r = await resolvePublicSite({ store, storage }, { host: "cafe.localhost:3000", platformHost: PLAT, pathSegments: ["no.html"] });
    expect(r.status).toBe(404);
  });
});
