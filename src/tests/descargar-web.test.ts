import { describe, it, expect } from "vitest";
import { unzipSync } from "fflate";
import { empaquetarWeb, nombreParaArchivo } from "@/src/export/descargar";
import type { StorageAdapter } from "@/src/storage/types";
import type { ProjectStore, ProjectRow, SnapshotRow } from "@/src/repositories/types";

class FakeStorage implements StorageAdapter {
  files = new Map<string, Buffer>();
  async put(key: string, body: Buffer | string) { this.files.set(key, Buffer.isBuffer(body) ? body : Buffer.from(body)); }
  async get(key: string) { const b = this.files.get(key); return b ? { body: b, contentType: "x" } : null; }
  async list(prefix: string) { return [...this.files.keys()].filter((k) => k.startsWith(prefix)); }
  async delete(key: string) { this.files.delete(key); }
}

function storeFalso(input: { nombre?: string; snapshot?: string | null; existe?: boolean } = {}) {
  const { nombre = "Mi Web", snapshot = "s2", existe = true } = input;
  return {
    async getProject(): Promise<ProjectRow | null> {
      return existe
        ? { id: "p1", orgId: "org1", nombre, entryPath: "index.html", currentSnapshotId: snapshot,
            subdominio: null, dominio: null, publishedSnapshotId: null, noIndexar: false,
            recogeFormularios: false, createdAt: "" }
        : null;
    },
    async getCurrentSnapshot(): Promise<SnapshotRow | null> {
      return snapshot
        ? { id: snapshot, projectId: "p1", storagePrefix: `projects/p1/snapshots/${snapshot}/`, tipo: "editado" }
        : null;
    },
  } as unknown as ProjectStore;
}

describe("descargar mi web", () => {
  /**
   * La instantánea ACTUAL y solo ella. Con dos instantáneas en el almacén —la
   * vieja y la de ahora— el ZIP lleva la de ahora: llevarse la vieja sería
   * darle al usuario una web que ya no es la suya sin que pueda notarlo.
   */
  it("empaqueta la instantánea actual entera, con rutas relativas", async () => {
    const storage = new FakeStorage();
    await storage.put("projects/p1/snapshots/s1/index.html", "<h1>vieja</h1>");
    await storage.put("projects/p1/snapshots/s2/index.html", "<h1>nueva</h1>");
    await storage.put("projects/p1/snapshots/s2/css/app.css", "body{}");
    await storage.put("projects/p1/snapshots/s2/wc-uploads/foto.webp", "bytes-de-foto");
    await storage.put("projects/p1/snapshots/s2/blog/mi-articulo.html", "<h1>art</h1>");

    const r = await empaquetarWeb({ store: storeFalso(), storage }, { orgId: "org1", projectId: "p1" });
    expect(r).not.toBeNull();

    const dentro = unzipSync(new Uint8Array(r!.zip));
    expect(Object.keys(dentro).sort()).toEqual([
      "blog/mi-articulo.html", "css/app.css", "index.html", "wc-uploads/foto.webp",
    ]);
    expect(Buffer.from(dentro["index.html"]).toString()).toBe("<h1>nueva</h1>");
    // Lo descargado tiene que poder volver a subirse tal cual: mismas reglas que
    // el importador (rutas relativas, sin prefijos de la plataforma).
    expect(Object.keys(dentro).every((p) => !p.startsWith("projects/"))).toBe(true);
  });

  it("un proyecto que no existe: null, no un ZIP vacío", async () => {
    const r = await empaquetarWeb(
      { store: storeFalso({ existe: false }), storage: new FakeStorage() },
      { orgId: "org1", projectId: "p1" }
    );
    expect(r).toBeNull();
  });

  it("sin instantánea, o con la instantánea vacía: también null", async () => {
    expect(await empaquetarWeb(
      { store: storeFalso({ snapshot: null }), storage: new FakeStorage() },
      { orgId: "org1", projectId: "p1" }
    )).toBeNull();
    // Con instantánea apuntada pero sin archivos debajo (no debería pasar, pero
    // un ZIP de cero bytes desconcierta más que un error claro).
    expect(await empaquetarWeb(
      { store: storeFalso(), storage: new FakeStorage() },
      { orgId: "org1", projectId: "p1" }
    )).toBeNull();
  });

  it("el nombre del archivo sale del nombre del proyecto", async () => {
    const storage = new FakeStorage();
    await storage.put("projects/p1/snapshots/s2/index.html", "x");
    const r = await empaquetarWeb(
      { store: storeFalso({ nombre: "Café Miró — ¡Tienda!" }), storage },
      { orgId: "org1", projectId: "p1" }
    );
    expect(r!.nombreArchivo).toBe("cafe-miro-tienda.zip");
  });
});

/**
 * Va dentro de Content-Disposition entre comillas: un acento o unas comillas
 * ahí es, según el navegador, un nombre roto o una cabecera malformada.
 */
describe("el nombre para el archivo", () => {
  it("quita acentos, espacios y símbolos", () => {
    expect(nombreParaArchivo("Café Miró")).toBe("cafe-miro");
    expect(nombreParaArchivo('Web "2026" (v2)')).toBe("web-2026-v2");
    expect(nombreParaArchivo("  --Peluquería Ñoño--  ")).toBe("peluqueria-nono");
  });

  it("si no queda nada usable, un nombre por defecto", () => {
    expect(nombreParaArchivo("")).toBe("mi-web");
    expect(nombreParaArchivo("¡¡¡···!!!")).toBe("mi-web");
  });
});
