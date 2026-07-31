import { describe, it, expect } from "vitest";
import {
  interpretarPropuesta, resumenCambios, proponerEdiciones, promptAsistente, MAX_OPS,
} from "@/src/asistente/proponer";
import { construirInventario } from "@/src/asistente/inventario";
import { EditorError } from "@/src/editor/errors";
import type { StorageAdapter } from "@/src/storage/types";
import type {
  ProjectStore, ProjectRow, SnapshotRow, SnapshotInfo, CreateProjectInput, CreateSnapshotInput,
  AssetRow, CreateAssetInput,
} from "@/src/repositories/types";

const DOC = (c: string) => `<!doctype html><html><head><title>t</title></head><body>${c}</body></html>`;
const idDe = (html: string, i = 0) => construirInventario(html)[i].id;

describe("interpretarPropuesta — la salida del modelo es no confiable", () => {
  it("mapea un cambio de texto válido a una EditOp text", () => {
    const html = DOC("<h1>Hola</h1>");
    const id = idDe(html);
    expect(interpretarPropuesta("index.html", html, { cambios: [{ nodeId: id, kind: "text", value: "Adiós" }] }))
      .toEqual([{ page: "index.html", nodeId: id, kind: "text", value: "Adiós" }]);
  });

  it("descarta nodeId inexistente", () => {
    const html = DOC("<h1>Hola</h1>");
    expect(interpretarPropuesta("index.html", html, { cambios: [{ nodeId: 9999, kind: "text", value: "x" }] }))
      .toEqual([]);
  });

  it("descarta kind desconocido", () => {
    const html = DOC("<h1>Hola</h1>");
    const id = idDe(html);
    expect(interpretarPropuesta("index.html", html, { cambios: [{ nodeId: id, kind: "borrar", value: "x" }] }))
      .toEqual([]);
  });

  it("descarta href peligrosa y conserva la segura", () => {
    const html = DOC('<a href="/old">x</a>');
    const id = idDe(html);
    expect(interpretarPropuesta("index.html", html, { cambios: [{ nodeId: id, kind: "href", value: "javascript:alert(1)" }] }))
      .toEqual([]);
    expect(interpretarPropuesta("index.html", html, { cambios: [{ nodeId: id, kind: "href", value: "https://x.com" }] }))
      .toEqual([{ page: "index.html", nodeId: id, kind: "href", value: "https://x.com" }]);
  });

  it("style: color válido pasa (property color); color inválido cae", () => {
    const html = DOC("<p>t</p>");
    const id = idDe(html);
    expect(interpretarPropuesta("index.html", html, { cambios: [{ nodeId: id, kind: "style", value: "#ff0000" }] }))
      .toEqual([{ page: "index.html", nodeId: id, kind: "style", property: "color", value: "#ff0000" }]);
    expect(interpretarPropuesta("index.html", html, { cambios: [{ nodeId: id, kind: "style", value: "red;background:url(x)" }] }))
      .toEqual([]);
  });

  it("coacciona nodeId en string tipo '#3'", () => {
    const html = DOC("<h1>Hola</h1>");
    const id = idDe(html);
    expect(interpretarPropuesta("index.html", html, { cambios: [{ nodeId: `#${id}`, kind: "text", value: "y" }] }))
      .toEqual([{ page: "index.html", nodeId: id, kind: "text", value: "y" }]);
  });

  it("richText se conserva como op richText (el saneado ocurre al aplicar)", () => {
    const html = DOC("<p>t</p>");
    const id = idDe(html);
    expect(interpretarPropuesta("index.html", html, { cambios: [{ nodeId: id, kind: "richText", value: "<b>hey</b>" }] }))
      .toEqual([{ page: "index.html", nodeId: id, kind: "richText", value: "<b>hey</b>" }]);
  });

  it("respeta MAX_OPS", () => {
    const html = DOC(Array.from({ length: MAX_OPS + 10 }, (_, i) => `<p>p${i}</p>`).join(""));
    const cambios = construirInventario(html).map((n) => ({ nodeId: n.id, kind: "text", value: "x" }));
    expect(interpretarPropuesta("index.html", html, { cambios })).toHaveLength(MAX_OPS);
  });
});

describe("resumenCambios", () => {
  it("muestra antes y después legibles", () => {
    const html = DOC("<h1>Hola</h1>");
    const id = idDe(html);
    expect(resumenCambios(html, [{ page: "index.html", nodeId: id, kind: "text", value: "Adiós" }]))
      .toEqual([{ nodeId: id, tag: "h1", kind: "text", antes: "Hola", despues: "Adiós" }]);
  });
});

// ---- Fakes (mismo patrón que save-edits.test) ----
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
    return { id: "p1", orgId: "org1", nombre: "Mi web", entryPath: "index.html", currentSnapshotId: "s0", subdominio: null, dominio: null, publishedSnapshotId: null, noIndexar: false, createdAt: "" };
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
  async createAsset(_i: CreateAssetInput): Promise<void> {}
  async getAsset(): Promise<AssetRow | null> { return null; }
  async getPublishedSiteByHost() { return null; }
  async setNoIndexar(): Promise<void> {}
  async setPublished(): Promise<void> {}
  async subdominioLibre(): Promise<boolean> { return true; }
  async setSubdominio(): Promise<boolean> { return true; }
  async dominioLibre(): Promise<boolean> { return true; }
  async setDominio(): Promise<boolean> { return true; }
}

describe("proponerEdiciones — propone, no aplica", () => {
  it("devuelve ops + resumen y NO crea snapshot", async () => {
    const storage = new FakeStorage();
    storage.files.set(CUR + "index.html", Buffer.from(DOC("<h1>Viejo</h1>")));
    const store = new FakeStore();
    const id = idDe(DOC("<h1>Viejo</h1>"));
    const pedir = async () => ({ cambios: [{ nodeId: id, kind: "text", value: "Nuevo" }] });
    const { ops, resumen } = await proponerEdiciones(
      { store, storage },
      { orgId: "org1", projectId: "p1", page: "index.html", instruccion: "mejora el título" },
      pedir
    );
    expect(ops).toEqual([{ page: "index.html", nodeId: id, kind: "text", value: "Nuevo" }]);
    expect(resumen[0]).toMatchObject({ antes: "Viejo", despues: "Nuevo" });
    expect(store.creado).toBeNull();
    expect(store.actualFijado).toBeNull();
  });

  it("instrucción vacía lanza EditorError", async () => {
    const storage = new FakeStorage();
    storage.files.set(CUR + "index.html", Buffer.from(DOC("<h1>x</h1>")));
    await expect(
      proponerEdiciones({ store: new FakeStore(), storage }, { orgId: "org1", projectId: "p1", page: "index.html", instruccion: "   " }, async () => ({ cambios: [] }))
    ).rejects.toThrow(EditorError);
  });

  it("si la página pedida no existe cae a la de entrada", async () => {
    const storage = new FakeStorage();
    storage.files.set(CUR + "index.html", Buffer.from(DOC("<h1>Home</h1>")));
    const id = idDe(DOC("<h1>Home</h1>"));
    const { ops, page } = await proponerEdiciones(
      { store: new FakeStore(), storage },
      { orgId: "org1", projectId: "p1", page: "no-existe.html", instruccion: "x" },
      async () => ({ cambios: [{ nodeId: id, kind: "text", value: "Z" }] })
    );
    expect(page).toBe("index.html");
    expect(ops[0]).toMatchObject({ page: "index.html", value: "Z" });
  });
});

// Sin estas reglas el modelo hace lo natural para él y desastroso para la web:
// mete la frase entera en el primer nodo y deja los demás vacíos. Un titular
// suele venir repartido porque cada trozo lleva su estilo (un degradado, otro
// color), así que juntarlo borra ese diseño sin que nadie lo vea venir.
describe("prompt: no aplastar frases repartidas en varios nodos", () => {
  const prompt = () => promptAsistente({
    instruccion: "Haz el titular más directo",
    nombre: "Mi web",
    inventario: construirInventario(DOC("<h1><span>Hola</span> <span>mundo</span></h1>")),
  });

  it("prohíbe dejar nodos vacíos", () => {
    expect(prompt()).toContain("NUNCA dejes un nodo vacío");
  });

  it("y explica qué hacer cuando la frase viene repartida", () => {
    const p = prompt();
    expect(p).toContain("REPARTIDA en varios nodos");
    expect(p).toContain("no juntes toda la frase en uno solo");
  });
});
