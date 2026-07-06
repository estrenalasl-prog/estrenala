import { describe, it, expect } from "vitest";
import { aplicarHerramientaAlProyecto, quitarHerramientaDelProyecto, estadoDeHerramientas } from "@/src/editor/tools";
import type { ProjectStore } from "@/src/repositories/types";
import type { StorageAdapter } from "@/src/storage/types";

const ASSET_ID = "01234567-89ab-4cde-8f01-23456789abcd";
const RUTA = `/wc-uploads/${ASSET_ID}.png`;

function fakes() {
  const archivos = new Map<string, { body: Buffer; contentType: string }>();
  const snapshots: Record<string, { id: string; storagePrefix: string }> = {
    s1: { id: "s1", storagePrefix: "p/s1/" },
  };
  let current = "s1";
  archivos.set("p/s1/index.html", { body: Buffer.from(`<html><head><title>a</title></head><body><p>uno</p></body></html>`), contentType: "text/html" });
  archivos.set("p/s1/otra.html", { body: Buffer.from(`<html><head><title>b</title></head><body><p>dos</p></body></html>`), contentType: "text/html" });
  archivos.set("p/s1/styles.css", { body: Buffer.from("body{}"), contentType: "text/css" });
  archivos.set("assets/p1/logo.png", { body: Buffer.from("PNGBYTES"), contentType: "image/png" });

  const storage = {
    async put(k: string, b: Buffer | string, ct?: string) { archivos.set(k, { body: Buffer.isBuffer(b) ? b : Buffer.from(b), contentType: ct ?? "" }); },
    async get(k: string) { return archivos.get(k) ?? null; },
    async list(prefix: string) { return [...archivos.keys()].filter((k) => k.startsWith(prefix)); },
    async delete(k: string) { archivos.delete(k); },
  } as unknown as StorageAdapter;

  const store = {
    async getProject() { return { id: "p1", orgId: "o1", nombre: "X", entryPath: "index.html", currentSnapshotId: current, subdominio: null, dominio: null, publishedSnapshotId: null, createdAt: "" }; },
    async getCurrentSnapshot() { return { ...snapshots[current], projectId: "p1", tipo: "edit" }; },
    async createSnapshot(i: { snapshotId: string; storagePrefix: string }) { snapshots[i.snapshotId] = { id: i.snapshotId, storagePrefix: i.storagePrefix }; },
    async setCurrentSnapshot(_o: string, _p: string, id: string) { current = id; },
    async getAsset(_o: string, _p: string, assetId: string) {
      if (assetId.toLowerCase() !== ASSET_ID) return null;
      return { id: assetId, projectId: "p1", storageKey: "assets/p1/logo.png", contentType: "image/png", bytes: 8, createdAt: "" };
    },
  } as unknown as ProjectStore;

  return { store, storage, archivos, actual: () => snapshots[current] };
}

const deps = (f: ReturnType<typeof fakes>) => ({ store: f.store, storage: f.storage });

describe("aplicarHerramientaAlProyecto", () => {
  it("aplica a TODAS las páginas html, crea snapshot nuevo y no toca el css", async () => {
    const f = fakes();
    const r = await aplicarHerramientaAlProyecto(deps(f), {
      orgId: "o1", projectId: "p1",
      herramienta: { tipo: "google-verification", codigo: "  Abc123_-Abc123_-XYZ " },
    });
    const pref = f.actual().storagePrefix;
    expect(f.actual().id).toBe(r.snapshotId);
    for (const page of ["index.html", "otra.html"]) {
      const html = (await f.storage.get(pref + page))!.body.toString();
      expect(html).toContain(`google-site-verification" content="Abc123_-Abc123_-XYZ"`);
    }
    expect((await f.storage.get(pref + "styles.css"))!.body.toString()).toBe("body{}");
  });
  it("verificación inválida → 400 con mensaje exacto y sin snapshot nuevo", async () => {
    const f = fakes();
    await expect(aplicarHerramientaAlProyecto(deps(f), {
      orgId: "o1", projectId: "p1", herramienta: { tipo: "google-verification", codigo: "corto" },
    })).rejects.toMatchObject({ message: "Código de verificación no válido (pega la etiqueta de Google o solo el código)", status: 400 });
    expect(f.actual().id).toBe("s1");
  });
  it("analytics inválido → 400 exacto; válido se normaliza a mayúsculas", async () => {
    const f = fakes();
    await expect(aplicarHerramientaAlProyecto(deps(f), {
      orgId: "o1", projectId: "p1", herramienta: { tipo: "analytics", medicion: "UA-1" },
    })).rejects.toMatchObject({ message: "ID de Analytics no válido (ejemplo: G-ABC1DE23FG)", status: 400 });
    await aplicarHerramientaAlProyecto(deps(f), {
      orgId: "o1", projectId: "p1", herramienta: { tipo: "analytics", medicion: "g-abc1de23fg" },
    });
    const html = (await f.storage.get(f.actual().storagePrefix + "index.html"))!.body.toString();
    expect(html).toContain("G-ABC1DE23FG");
  });
  it("favicon: copia la imagen del asset a wc-uploads del snapshot nuevo", async () => {
    const f = fakes();
    await aplicarHerramientaAlProyecto(deps(f), {
      orgId: "o1", projectId: "p1", herramienta: { tipo: "favicon", ruta: RUTA },
    });
    const pref = f.actual().storagePrefix;
    expect((await f.storage.get(pref + RUTA.slice(1)))!.body.toString()).toBe("PNGBYTES");
    expect((await f.storage.get(pref + "index.html"))!.body.toString()).toContain(`<link rel="icon" href="${RUTA}">`);
  });
  it("ruta inválida o asset ajeno → 400 «Imagen no válida»", async () => {
    const f = fakes();
    await expect(aplicarHerramientaAlProyecto(deps(f), {
      orgId: "o1", projectId: "p1", herramienta: { tipo: "favicon", ruta: "/x.png" },
    })).rejects.toMatchObject({ message: "Imagen no válida", status: 400 });
    await expect(aplicarHerramientaAlProyecto(deps(f), {
      orgId: "o1", projectId: "p1",
      herramienta: { tipo: "favicon", ruta: "/wc-uploads/99999999-9999-4999-8999-999999999999.png" },
    })).rejects.toMatchObject({ message: "Imagen no válida", status: 400 });
  });
  it("si una página no tiene cabecera editable, falla 400 y no deja archivos huérfanos", async () => {
    const f = fakes();
    f.archivos.set("p/s1/rota.html", { body: Buffer.from(`<p>solo</p>`), contentType: "text/html" });
    await expect(aplicarHerramientaAlProyecto(deps(f), {
      orgId: "o1", projectId: "p1",
      herramienta: { tipo: "google-verification", codigo: "Abc123_-Abc123_-XYZ" },
    })).rejects.toMatchObject({ message: "Esta página no tiene cabecera editable", status: 400 });
    expect(f.actual().id).toBe("s1");
    const huerfanos = [...f.archivos.keys()].filter((k) => !k.startsWith("p/s1/") && !k.startsWith("assets/"));
    expect(huerfanos).toEqual([]);
  });
});

describe("quitar y estado", () => {
  it("quitar crea snapshot sin la herramienta; estado lo refleja", async () => {
    const f = fakes();
    await aplicarHerramientaAlProyecto(deps(f), {
      orgId: "o1", projectId: "p1", herramienta: { tipo: "analytics", medicion: "G-ABC1DE23FG" },
    });
    expect((await estadoDeHerramientas(deps(f), { orgId: "o1", projectId: "p1" })).analytics).toBe("G-ABC1DE23FG");
    await quitarHerramientaDelProyecto(deps(f), { orgId: "o1", projectId: "p1", tipo: "analytics" });
    expect((await estadoDeHerramientas(deps(f), { orgId: "o1", projectId: "p1" })).analytics).toBeNull();
    const html = (await f.storage.get(f.actual().storagePrefix + "otra.html"))!.body.toString();
    expect(html).not.toContain("data-wc-tool");
  });
  it("tipo desconocido → 400 «Herramienta desconocida»", async () => {
    const f = fakes();
    await expect(quitarHerramientaDelProyecto(deps(f), { orgId: "o1", projectId: "p1", tipo: "nada" as never }))
      .rejects.toMatchObject({ message: "Herramienta desconocida", status: 400 });
  });
});
