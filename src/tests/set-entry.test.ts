import { describe, it, expect } from "vitest";
import { setEntryPath, listPages } from "@/src/projects/entry";
import type { StorageAdapter } from "@/src/storage/types";
import type { ProjectStore, ProjectRow, SnapshotRow, CreateProjectInput } from "@/src/repositories/types";

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
    return { id: "p1", orgId: "org1", nombre: "x", entryPath: "index.html", currentSnapshotId: "s1", createdAt: "" };
  }
  async listProjects(): Promise<ProjectRow[]> { return []; }
  async setEntryPath(_o: string, _p: string, e: string) { this.entryGuardado = e; }
  async getCurrentSnapshot(): Promise<SnapshotRow | null> {
    return { id: "s1", projectId: "p1", storagePrefix: prefix, tipo: "import" };
  }
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
