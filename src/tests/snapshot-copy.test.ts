import { describe, it, expect } from "vitest";
import { crearSnapshotEditado } from "@/src/editor/snapshot-copy";
import { snapshotPrefix } from "@/src/storage/keys";
import type { ProjectStore, CreateSnapshotInput } from "@/src/repositories/types";
import type { StorageAdapter } from "@/src/storage/types";

function fakes() {
  const archivos = new Map<string, { body: Buffer; contentType: string }>();
  archivos.set("p/s1/index.html", { body: Buffer.from("<html><head><title>a</title></head><body>uno</body></html>"), contentType: "text/html" });
  archivos.set("p/s1/otra.html", { body: Buffer.from("<html><head><title>b</title></head><body>dos</body></html>"), contentType: "text/html" });
  archivos.set("p/s1/styles.css", { body: Buffer.from("body{}"), contentType: "text/css" });

  const puts: { path: string; contentType?: string }[] = [];
  const storage = {
    async put(k: string, b: Buffer | string, ct?: string) {
      archivos.set(k, { body: Buffer.isBuffer(b) ? b : Buffer.from(b), contentType: ct ?? "" });
      puts.push({ path: k, contentType: ct });
    },
    async get(k: string) { return archivos.get(k) ?? null; },
    async list(prefix: string) { return [...archivos.keys()].filter((k) => k.startsWith(prefix)); },
    async delete(k: string) { archivos.delete(k); },
  } as unknown as StorageAdapter;

  const createSnapshotCalls: CreateSnapshotInput[] = [];
  const store = {
    async createSnapshot(i: CreateSnapshotInput) { createSnapshotCalls.push(i); },
    async setCurrentSnapshot() { /* no-op */ },
  } as unknown as ProjectStore;

  return { store, storage, archivos, puts, createSnapshotCalls };
}

const deps = (f: ReturnType<typeof fakes>) => ({ store: f.store, storage: f.storage });

const baseInput = {
  orgId: "o1",
  projectId: "p1",
  currentSnapshot: { id: "s1", storagePrefix: "p/s1/" },
  transformar: (_rel: string, _html: string) => null,
  operacionesJson: {},
};

describe("crearSnapshotEditado — excluir y tipo", () => {
  it("copia todo por defecto y crea snapshot tipo 'edit'", async () => {
    const f = fakes();
    const r = await crearSnapshotEditado(deps(f), { ...baseInput });
    const pref = snapshotPrefix("p1", r.snapshotId);
    const rutas = f.puts.map((p) => p.path);
    expect(rutas).toEqual(expect.arrayContaining([pref + "index.html", pref + "otra.html", pref + "styles.css"]));
    expect(f.createSnapshotCalls[0].tipo).toBe("edit");
  });

  it("excluir omite esas rutas del copiado (no aparecen en el snapshot nuevo)", async () => {
    const f = fakes();
    const r = await crearSnapshotEditado(deps(f), { ...baseInput, excluir: new Set(["styles.css"]) });
    const pref = snapshotPrefix("p1", r.snapshotId);
    const rutas = f.puts.map((p) => p.path);
    expect(rutas).not.toContain(pref + "styles.css");
    expect(rutas).toEqual(expect.arrayContaining([pref + "index.html", pref + "otra.html"]));
  });

  it("extras escriben aunque la ruta esté en excluir (excluir+extra = reemplazo sin doble put)", async () => {
    const f = fakes();
    const extras = new Map<string, { body: Buffer; contentType: string }>([
      ["styles.css", { body: Buffer.from("body{color:red}"), contentType: "text/css" }],
    ]);
    const r = await crearSnapshotEditado(deps(f), {
      ...baseInput, excluir: new Set(["styles.css"]), extras,
    });
    const pref = snapshotPrefix("p1", r.snapshotId);
    const rutasStyles = f.puts.filter((p) => p.path === pref + "styles.css");
    expect(rutasStyles).toHaveLength(1);
    const escrito = await f.storage.get(pref + "styles.css");
    expect(escrito!.body.toString()).toBe("body{color:red}");
  });

  it("tipo 'blog' llega a createSnapshot", async () => {
    const f = fakes();
    await crearSnapshotEditado(deps(f), { ...baseInput, tipo: "blog" });
    expect(f.createSnapshotCalls[0].tipo).toBe("blog");
  });
});
