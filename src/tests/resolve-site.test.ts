import { describe, it, expect } from "vitest";
import { resolvePublicSite } from "@/src/publish/resolve-site";
import { conMarca, ID_MARCA, TEXTO_MARCA } from "@/src/publish/marca";
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
  sitios = new Map<string, { entryPath: string; storagePrefix: string; plan: string }>(); // clave: "sub:x" | "dom:x"
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
  async dominioLibre(): Promise<boolean> { return true; }
  async setDominio(): Promise<boolean> { return true; }
}

// plan por defecto: de pago, para que estas pruebas comprueben el HTML tal cual.
// La marca del plan gratuito tiene su propio bloque más abajo.
function preparado(plan = "personal") {
  const storage = new FakeStorage();
  storage.files.set(PREFIX + "index.html", Buffer.from(HTML));
  storage.files.set(PREFIX + "css/app.css", Buffer.from("body{}"));
  const store = new FakeStore();
  store.sitios.set("sub:cafe", { entryPath: "index.html", storagePrefix: PREFIX, plan });
  store.sitios.set("dom:quantivatechnology.com", { entryPath: "index.html", storagePrefix: PREFIX, plan });
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

describe("marca «Hecho con Estrénala» (plan gratuito)", () => {
  const pedir = (store: ProjectStore, storage: StorageAdapter, segs: string[] = []) =>
    resolvePublicSite({ store, storage }, { host: "cafe.localhost:3000", platformHost: PLAT, pathSegments: segs });

  it("el HTML del plan gratuito sale con la insignia justo antes de </body>", async () => {
    const { storage, store } = preparado("free");
    const html = (await pedir(store, storage)).body.toString();
    expect(html).toContain(TEXTO_MARCA);
    expect(html.indexOf(`id="${ID_MARCA}"`)).toBeLessThan(html.indexOf("</body>"));
    expect(html).toContain("<h1>Hola</h1>"); // no se ha tocado nada del original
  });

  it("un plan de pago NO lleva marca", async () => {
    for (const plan of ["personal", "agencia"]) {
      const { storage, store } = preparado(plan);
      expect((await pedir(store, storage)).body.toString()).not.toContain(ID_MARCA);
    }
  });

  it("un plan desconocido cuenta como gratuito (ante la duda, marca)", async () => {
    const { storage, store } = preparado("inventado");
    expect((await pedir(store, storage)).body.toString()).toContain(ID_MARCA);
  });

  it("los assets que no son HTML se sirven intactos", async () => {
    const { storage, store } = preparado("free");
    const r = await pedir(store, storage, ["css", "app.css"]);
    expect(r.body.toString()).toBe("body{}");
  });

  it("la 404 pública no duplica la insignia (ya lleva su propia promo)", async () => {
    const { storage, store } = preparado("free");
    const r = await resolvePublicSite({ store, storage }, { host: "nadie.localhost:3000", platformHost: PLAT, pathSegments: [] });
    expect(r.body.toString()).not.toContain(ID_MARCA);
  });
});

describe("conMarca", () => {
  it("sin </body> la añade al final", () => {
    expect(conMarca("<h1>hola</h1>", PLAT).endsWith("</a>")).toBe(true);
  });

  it("usa el ÚLTIMO </body> (por si aparece dentro del texto)", () => {
    const html = "<body>habla de &lt;/body&gt; y esto: </body></html>";
    const salida = conMarca(html, PLAT);
    expect(salida.indexOf(ID_MARCA)).toBeGreaterThan(salida.indexOf("y esto:"));
  });

  it("es idempotente: no mete dos insignias", () => {
    const una = conMarca(HTML, PLAT);
    expect(conMarca(una, PLAT)).toBe(una);
  });

  it("escapa el host de la plataforma", () => {
    expect(conMarca(HTML, `x"><script>alert(1)</script>`, )).not.toContain("<script>alert(1)");
  });
});

describe("redirect www → dominio pelado", () => {
  const storeConDominio = (dominio: string) => ({
    async getPublishedSiteByHost(q: { subdominio: string } | { dominio: string }) {
      if ("dominio" in q && q.dominio === dominio)
        return { entryPath: "index.html", storagePrefix: "p/", plan: "personal" };
      return null;
    },
  }) as unknown as import("@/src/repositories/types").ProjectStore;
  const storage = {
    async get() { return { body: Buffer.from("<html>ok</html>"), contentType: "text/html; charset=utf-8" }; },
    async put() {}, async list() { return []; }, async delete() {},
  } as unknown as import("@/src/storage/types").StorageAdapter;

  it("www de un dominio publicado → 301 al pelado conservando la ruta", async () => {
    const r = await resolvePublicSite(
      { store: storeConDominio("cliente.com"), storage },
      { host: "www.cliente.com", platformHost: "app.plataforma.com", sitesBaseDomain: "plataforma.com", pathSegments: ["contacto.html"] }
    );
    expect(r.status).toBe(301);
    expect(r.location).toBe("https://cliente.com/contacto.html");
  });
  it("www sin ruta → 301 a la raíz", async () => {
    const r = await resolvePublicSite(
      { store: storeConDominio("cliente.com"), storage },
      { host: "www.cliente.com", platformHost: "app.plataforma.com", sitesBaseDomain: "plataforma.com", pathSegments: [] }
    );
    expect(r.status).toBe(301);
    expect(r.location).toBe("https://cliente.com/");
  });
  it("www de un dominio NO publicado → 404 normal", async () => {
    const r = await resolvePublicSite(
      { store: storeConDominio("otro.com"), storage },
      { host: "www.cliente.com", platformHost: "app.plataforma.com", sitesBaseDomain: "plataforma.com", pathSegments: [] }
    );
    expect(r.status).toBe(404);
  });
});
