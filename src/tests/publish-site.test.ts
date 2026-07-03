import { describe, it, expect } from "vitest";
import { publishSite, unpublishSite, cambiarSubdominio } from "@/src/publish/publish-site";
import { PublishError } from "@/src/publish/errors";
import type { DeployTarget } from "@/src/publish/deploy-target";
import type {
  ProjectStore, ProjectRow, SnapshotRow, SnapshotInfo,
  CreateProjectInput, CreateSnapshotInput, AssetRow, CreateAssetInput,
} from "@/src/repositories/types";

class FakeStore implements ProjectStore {
  nombre = "Cafetería Aurora";
  subdominio: string | null = null;
  publishedSnapshotId: string | null = null;
  currentSnapshot: SnapshotRow | null = { id: "s1", projectId: "p1", storagePrefix: "projects/p1/snapshots/s1/", tipo: "edit" };
  ocupados = new Set<string>();
  hayProyecto = true;
  setSubdominioDevuelve = true;

  async createProjectWithSnapshot(i: CreateProjectInput) { return { projectId: i.projectId }; }
  async getProject(): Promise<ProjectRow | null> {
    if (!this.hayProyecto) return null;
    return {
      id: "p1", orgId: "org1", nombre: this.nombre, entryPath: "index.html",
      currentSnapshotId: this.currentSnapshot?.id ?? null,
      subdominio: this.subdominio, dominio: null, publishedSnapshotId: this.publishedSnapshotId,
      createdAt: "",
    };
  }
  async listProjects(): Promise<ProjectRow[]> { return []; }
  async setEntryPath(): Promise<void> {}
  async getCurrentSnapshot(): Promise<SnapshotRow | null> { return this.currentSnapshot; }
  async createSnapshot(_i: CreateSnapshotInput) {}
  async setCurrentSnapshot(): Promise<void> {}
  async listSnapshots(): Promise<SnapshotInfo[]> { return []; }
  async getSnapshotById(): Promise<SnapshotRow | null> { return null; }
  async createAsset(_i: CreateAssetInput) {}
  async getAsset(): Promise<AssetRow | null> { return null; }
  async getPublishedSiteByHost(): Promise<{ entryPath: string; storagePrefix: string } | null> { return null; }
  async setPublished(_o: string, _p: string, id: string | null) { this.publishedSnapshotId = id; }
  async subdominioLibre(s: string): Promise<boolean> { return !this.ocupados.has(s); }
  async setSubdominio(_o: string, _p: string, s: string): Promise<boolean> {
    if (!this.setSubdominioDevuelve) return false;
    this.subdominio = s; return true;
  }
}

class FakeDeploy implements DeployTarget {
  publicados: string[] = [];
  despublicados: string[] = [];
  async publish(i: { subdominio: string }) { this.publicados.push(i.subdominio); return { ok: true as const }; }
  async unpublish(i: { subdominio: string }) { this.despublicados.push(i.subdominio); }
}

describe("publishSite", () => {
  it("primera publicación: genera slug del nombre, fija puntero y llama al deploy", async () => {
    const store = new FakeStore(); const deploy = new FakeDeploy();
    const r = await publishSite({ store, deploy }, { orgId: "org1", projectId: "p1" });
    expect(r.subdominio).toBe("cafeteria-aurora");
    expect(r.publishedSnapshotId).toBe("s1");
    expect(store.subdominio).toBe("cafeteria-aurora");
    expect(store.publishedSnapshotId).toBe("s1");
    expect(deploy.publicados).toEqual(["cafeteria-aurora"]);
  });

  it("colisión de slug → sufijo -2", async () => {
    const store = new FakeStore(); store.ocupados.add("cafeteria-aurora");
    const r = await publishSite({ store, deploy: new FakeDeploy() }, { orgId: "org1", projectId: "p1" });
    expect(r.subdominio).toBe("cafeteria-aurora-2");
  });

  it("nombre reservado → salta al sufijo", async () => {
    const store = new FakeStore(); store.nombre = "www";
    const r = await publishSite({ store, deploy: new FakeDeploy() }, { orgId: "org1", projectId: "p1" });
    expect(r.subdominio).toBe("www-2");
  });

  it("republicar conserva el subdominio existente", async () => {
    const store = new FakeStore(); store.subdominio = "mi-sub";
    const r = await publishSite({ store, deploy: new FakeDeploy() }, { orgId: "org1", projectId: "p1" });
    expect(r.subdominio).toBe("mi-sub");
  });

  it("sin snapshot actual → 400", async () => {
    const store = new FakeStore(); store.currentSnapshot = null;
    await expect(publishSite({ store, deploy: new FakeDeploy() }, { orgId: "org1", projectId: "p1" }))
      .rejects.toThrow(PublishError);
  });

  it("carrera en setSubdominio → 409", async () => {
    const store = new FakeStore(); store.setSubdominioDevuelve = false;
    await expect(publishSite({ store, deploy: new FakeDeploy() }, { orgId: "org1", projectId: "p1" }))
      .rejects.toMatchObject({ status: 409 });
  });
});

describe("unpublishSite", () => {
  it("pone el puntero a null y notifica al deploy", async () => {
    const store = new FakeStore(); store.subdominio = "mi-sub"; store.publishedSnapshotId = "s1";
    const deploy = new FakeDeploy();
    await unpublishSite({ store, deploy }, { orgId: "org1", projectId: "p1" });
    expect(store.publishedSnapshotId).toBeNull();
    expect(deploy.despublicados).toEqual(["mi-sub"]);
  });
});

describe("cambiarSubdominio", () => {
  it("cambia un subdominio válido y libre", async () => {
    const store = new FakeStore();
    const r = await cambiarSubdominio({ store }, { orgId: "org1", projectId: "p1", subdominio: "Nuevo-Sub" });
    expect(r.subdominio).toBe("nuevo-sub"); // normaliza a minúsculas
    expect(store.subdominio).toBe("nuevo-sub");
  });
  it("formato inválido → 400", async () => {
    await expect(cambiarSubdominio({ store: new FakeStore() }, { orgId: "org1", projectId: "p1", subdominio: "-malo-" }))
      .rejects.toMatchObject({ status: 400 });
  });
  it("reservado → 400 con mensaje de reservado", async () => {
    await expect(cambiarSubdominio({ store: new FakeStore() }, { orgId: "org1", projectId: "p1", subdominio: "www" }))
      .rejects.toMatchObject({ status: 400, message: "Ese subdominio está reservado" });
  });
  it("ocupado → 409", async () => {
    const store = new FakeStore(); store.ocupados.add("tomado");
    await expect(cambiarSubdominio({ store }, { orgId: "org1", projectId: "p1", subdominio: "tomado" }))
      .rejects.toMatchObject({ status: 409 });
  });
});
