import { describe, it, expect } from "vitest";
import { saveEdits } from "@/src/editor/save-edits";
import { EditorError } from "@/src/editor/errors";
import type { StorageAdapter } from "@/src/storage/types";
import type {
  ProjectStore, ProjectRow, SnapshotRow, SnapshotInfo, CreateProjectInput, CreateSnapshotInput,
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
    return { id: "p1", orgId: "org1", nombre: "x", entryPath: "index.html", currentSnapshotId: "s0", createdAt: "" };
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
});
