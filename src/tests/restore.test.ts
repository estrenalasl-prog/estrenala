import { describe, it, expect } from "vitest";
import { restoreSnapshot } from "@/src/editor/restore";
import { EditorError } from "@/src/editor/errors";
import type {
  ProjectStore, ProjectRow, SnapshotRow, SnapshotInfo, CreateProjectInput, CreateSnapshotInput,
  AssetRow, CreateAssetInput,
} from "@/src/repositories/types";

class StubStore implements ProjectStore {
  fijado: string | null = null;
  constructor(private existe: boolean) {}
  async createProjectWithSnapshot(i: CreateProjectInput) { return { projectId: i.projectId }; }
  async getProject(): Promise<ProjectRow | null> { return null; }
  async listProjects(): Promise<ProjectRow[]> { return []; }
  async setEntryPath(): Promise<void> {}
  async getCurrentSnapshot(): Promise<SnapshotRow | null> { return null; }
  async createSnapshot(_i: CreateSnapshotInput) {}
  async setCurrentSnapshot(_o: string, _p: string, id: string) { this.fijado = id; }
  async listSnapshots(): Promise<SnapshotInfo[]> { return []; }
  async getSnapshotById(): Promise<SnapshotRow | null> {
    return this.existe ? { id: "s1", projectId: "p1", storagePrefix: "x", tipo: "edit" } : null;
  }
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

describe("restoreSnapshot", () => {
  it("fija el snapshot como actual si pertenece al proyecto", async () => {
    const store = new StubStore(true);
    await restoreSnapshot({ store }, { orgId: "o", projectId: "p1", snapshotId: "s1" });
    expect(store.fijado).toBe("s1");
  });

  it("lanza 404 si el snapshot no es del proyecto", async () => {
    await expect(
      restoreSnapshot({ store: new StubStore(false) }, { orgId: "o", projectId: "p1", snapshotId: "ajeno" })
    ).rejects.toThrow(EditorError);
  });
});
