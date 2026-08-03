import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { validarPlantillas, generarPlantillas } from "@/src/blog/site-template";
import { pedirJson } from "@/src/ia/claude";
import type { ProjectStore, ProjectRow, SnapshotRow } from "@/src/repositories/types";
import type { StorageAdapter } from "@/src/storage/types";

// Cada espacio usa SU clave (ver src/config/claves.ts). Estos tests no van de
// resolverla, asi que se sustituye el resolutor y se controla desde aqui. Antes
// bastaba con poner la variable de entorno, pero ese respaldo se quito: hacia
// que la IA de los clientes la pagara la plataforma.
const claves = vi.hoisted(() => ({ openrouter: "", serpapi: "" }));
vi.mock("@/src/config/claves", () => ({
  claveOpenRouter: async () => claves.openrouter,
  claveSerpApi: async () => claves.serpapi,
  modeloOrganizacion: async () => "",
}));


vi.mock("@/src/ia/claude", () => {
  class OpenRouterError extends Error {
    status: number;
    constructor(status: number, message: string) {
      super(message);
      this.status = status;
      this.name = "OpenRouterError";
    }
  }
  return { pedirJson: vi.fn(), PlantillasSchema: {}, OpenRouterError };
});

type Mock = ReturnType<typeof vi.fn>;
const pedirJsonMock = pedirJson as unknown as Mock;

const PLANTILLA_POST_VALIDA =
  '<html><head><title>{{titulo}}</title><meta name="description" content="{{meta_descripcion}}"></head><body>{{contenido}}</body></html>';
const PLANTILLA_INDEX_VALIDA =
  "<html><body><!--POST-->{{titulo}} {{slug}} {{meta_descripcion}} {{fecha}} {{imagen}}<!--/POST--></body></html>";

describe("validarPlantillas", () => {
  it("acepta plantillas con los huecos/marcadores requeridos (con espacios {{ titulo }})", () => {
    const tplPost =
      "<html>{{ titulo }} {{meta_descripcion}} {{contenido}} {{imagen}} {{fecha}} {{canonical}} {{json_ld}}</html>";
    const tplIndex = "<!--POST-->{{ titulo }} {{slug}} {{meta_descripcion}} {{fecha}} {{imagen}}<!--/POST-->";
    expect(validarPlantillas(tplPost, tplIndex)).toEqual([]);
  });

  it("artículo sin {{contenido}} → mensaje byte-exacto de huecos requeridos", () => {
    const tplPost = "<html>{{titulo}} {{meta_descripcion}} {{imagen}} {{fecha}} {{canonical}} {{json_ld}}</html>";
    const tplIndex = PLANTILLA_INDEX_VALIDA;
    expect(validarPlantillas(tplPost, tplIndex)).toEqual([
      "La plantilla de artículo debe contener los huecos {{titulo}}, {{meta_descripcion}} y {{contenido}}",
    ]);
  });

  it("índice sin marcadores o en orden inverso → mensaje byte-exacto de marcadores", () => {
    const tplPost = PLANTILLA_POST_VALIDA;
    const sinMarcadores = "<html><body>sin marcadores aquí</body></html>";
    expect(validarPlantillas(tplPost, sinMarcadores)).toEqual([
      "La plantilla de índice debe contener los marcadores <!--POST--> y <!--/POST-->",
    ]);
    const invertido = "<!--/POST-->contenido<!--POST-->";
    expect(validarPlantillas(tplPost, invertido)).toEqual([
      "La plantilla de índice debe contener los marcadores <!--POST--> y <!--/POST-->",
    ]);
  });

  it("hueco desconocido → «La plantilla usa huecos desconocidos: precio»", () => {
    const tplPost = "<html>{{titulo}} {{meta_descripcion}} {{contenido}} {{precio}}</html>";
    const tplIndex = PLANTILLA_INDEX_VALIDA;
    expect(validarPlantillas(tplPost, tplIndex)).toEqual([
      "La plantilla usa huecos desconocidos: precio",
    ]);
  });
});

function projectRow(overrides: Partial<ProjectRow> = {}): ProjectRow {
  return {
    id: "p1",
    orgId: "o1",
    nombre: "Mi Sitio",
    entryPath: "index.html",
    currentSnapshotId: "s1",
    subdominio: null,
    dominio: null,
    publishedSnapshotId: null,
    noIndexar: false, recogeFormularios: false,
    createdAt: "",
    ...overrides,
  };
}

function snapshotRow(overrides: Partial<SnapshotRow> = {}): SnapshotRow {
  return { id: "s1", projectId: "p1", storagePrefix: "p/s1/", tipo: "edit", ...overrides };
}

function makeStore(project: ProjectRow | null, snapshot: SnapshotRow | null): ProjectStore {
  return {
    async getProject() {
      return project;
    },
    async getCurrentSnapshot() {
      return snapshot;
    },
  } as unknown as ProjectStore;
}

function makeStorage(files: Record<string, string>) {
  const calls: string[] = [];
  const storage = {
    async get(key: string) {
      calls.push(key);
      if (!(key in files)) return null;
      return { body: Buffer.from(files[key], "utf-8"), contentType: "text/html" };
    },
  } as unknown as StorageAdapter;
  return { storage, calls };
}

describe("generarPlantillas", () => {
  beforeEach(() => {
    claves.openrouter = "sk-test";
    pedirJsonMock.mockReset();
  });
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("sin clave de OpenRouter (ni UI ni .env) → EditorError 500 con el mensaje de Configuración", async () => {
    claves.openrouter = "";
    const store = makeStore(projectRow(), snapshotRow());
    const { storage } = makeStorage({ "p/s1/index.html": "<html><body>x</body></html>" });
    await expect(
      generarPlantillas({ store, storage }, { orgId: "o1", projectId: "p1" })
    ).rejects.toMatchObject({ message: "Falta la clave de OpenRouter: añádela en Configuración", status: 500 });
  });

  it("adjunta el HTML de la portada y resuelve el link del CSS a ruta absoluta desde la raíz", async () => {
    const project = projectRow({ entryPath: "pages/index.html" });
    const snapshot = snapshotRow();
    const html =
      '<html><head><link rel="stylesheet" href="../assets/styles.css"></head><body>UNIQUE_MARKER_HTML</body></html>';
    const { storage, calls } = makeStorage({
      "p/s1/pages/index.html": html,
      "p/s1/assets/styles.css": "body{background:#123456}",
    });
    const store = makeStore(project, snapshot);
    let capturedPrompt = "";
    pedirJsonMock.mockImplementation(async (prompt: string) => {
      capturedPrompt = prompt;
      return { plantilla_post: PLANTILLA_POST_VALIDA, plantilla_index: PLANTILLA_INDEX_VALIDA };
    });

    const r = await generarPlantillas({ store, storage }, { orgId: "o1", projectId: "p1" });

    expect(capturedPrompt).toContain("UNIQUE_MARKER_HTML");
    // El link "../assets/styles.css" desde pages/index.html → raíz "/assets/styles.css".
    expect(capturedPrompt).toContain('<link rel="stylesheet" href="/assets/styles.css">');
    // NO se envía el contenido del CSS (salida pequeña y sin tentación de incrustarlo).
    expect(capturedPrompt).not.toContain("body{background:#123456}");
    // No se lee el archivo de CSS: solo la portada.
    expect(calls).toEqual(["p/s1/pages/index.html"]);
    expect(r).toEqual({ tplPost: PLANTILLA_POST_VALIDA, tplIndex: PLANTILLA_INDEX_VALIDA });
  });

  it("enlaza TODAS las hojas locales (raíz-absolutas) y prohíbe incrustar CSS", async () => {
    // El blog vive en el mismo sitio → la plantilla enlaza las hojas, no las copia.
    // Esto evita respuestas gigantes (truncado + coste).
    const project = projectRow({ entryPath: "pages/index.html" });
    const snapshot = snapshotRow();
    const html =
      '<html><head><link rel="stylesheet" href="../assets/styles.css"><link rel="stylesheet" href="../pages.css"></head><body>X</body></html>';
    const { storage } = makeStorage({
      "p/s1/pages/index.html": html,
    });
    const store = makeStore(project, snapshot);
    let capturedPrompt = "";
    pedirJsonMock.mockImplementation(async (prompt: string) => {
      capturedPrompt = prompt;
      return { plantilla_post: PLANTILLA_POST_VALIDA, plantilla_index: PLANTILLA_INDEX_VALIDA };
    });

    await generarPlantillas({ store, storage }, { orgId: "o1", projectId: "p1" });

    // Enlaza ambas hojas locales con ruta absoluta desde la raíz del sitio.
    expect(capturedPrompt).toContain('<link rel="stylesheet" href="/assets/styles.css">');
    expect(capturedPrompt).toContain('<link rel="stylesheet" href="/pages.css">');
    // Instrucción explícita de NO incrustar CSS.
    expect(capturedPrompt).toContain("NO escribas ninguna etiqueta <style>");
  });

  it("css absoluto (https://) se ignora: no se enlaza el CDN externo", async () => {
    const project = projectRow({ entryPath: "index.html" });
    const snapshot = snapshotRow();
    const html =
      '<html><head><link rel="stylesheet" href="https://cdn.example.com/style.css"></head><body>X</body></html>';
    const { storage, calls } = makeStorage({ "p/s1/index.html": html });
    const store = makeStore(project, snapshot);
    let capturedPrompt = "";
    pedirJsonMock.mockImplementation(async (prompt: string) => {
      capturedPrompt = prompt;
      return { plantilla_post: PLANTILLA_POST_VALIDA, plantilla_index: PLANTILLA_INDEX_VALIDA };
    });

    await generarPlantillas({ store, storage }, { orgId: "o1", projectId: "p1" });

    // La hoja de CDN externa no se enlaza: al no haber hojas locales, el bloque de
    // enlaces lleva el aviso de fallback (la URL del CDN sí aparece, pero solo dentro
    // del HTML de la portada que se adjunta como referencia, no como <link> generado).
    expect(capturedPrompt).toContain("el sitio no tiene hojas de estilo locales");
    // Solo se lee la portada (nunca ficheros CSS).
    expect(calls).toEqual(["p/s1/index.html"]);
  });

  it("pedirJson lanza → EditorError 502 «No se pudo generar la plantilla del blog, vuelve a intentarlo»", async () => {
    const store = makeStore(projectRow(), snapshotRow());
    const { storage } = makeStorage({ "p/s1/index.html": "<html><body>x</body></html>" });
    pedirJsonMock.mockRejectedValue(new Error("boom"));

    await expect(
      generarPlantillas({ store, storage }, { orgId: "o1", projectId: "p1" })
    ).rejects.toMatchObject({
      message: "No se pudo generar la plantilla del blog, vuelve a intentarlo",
      status: 502,
    });
  });

  it("sin saldo en OpenRouter (402) → mensaje claro accionable con status 402", async () => {
    const { OpenRouterError } = await import("@/src/ia/claude");
    const store = makeStore(projectRow(), snapshotRow());
    const { storage } = makeStorage({ "p/s1/index.html": "<html><body>x</body></html>" });
    pedirJsonMock.mockRejectedValue(new OpenRouterError(402, "OpenRouter HTTP 402: Insufficient credits"));

    await expect(
      generarPlantillas({ store, storage }, { orgId: "o1", projectId: "p1" })
    ).rejects.toMatchObject({
      message: "Tu cuenta de OpenRouter no tiene saldo. Añade crédito en openrouter.ai/settings/credits e inténtalo de nuevo.",
      status: 402,
    });
  });

  it("respuesta que no valida (validarPlantillas) → mismo 502", async () => {
    const store = makeStore(projectRow(), snapshotRow());
    const { storage } = makeStorage({ "p/s1/index.html": "<html><body>x</body></html>" });
    pedirJsonMock.mockResolvedValue({
      plantilla_post: "<html>{{titulo}}</html>",
      plantilla_index: "sin marcadores",
    });

    await expect(
      generarPlantillas({ store, storage }, { orgId: "o1", projectId: "p1" })
    ).rejects.toMatchObject({
      message: "No se pudo generar la plantilla del blog, vuelve a intentarlo",
      status: 502,
    });
  });

  it("proyecto inexistente → 404 «Proyecto no encontrado»; sin snapshot → 400 «El proyecto no tiene snapshot actual»; sin entrada en storage → 400 «El proyecto no tiene página de entrada»", async () => {
    const store1 = makeStore(null, null);
    const { storage: storage1 } = makeStorage({});
    await expect(
      generarPlantillas({ store: store1, storage: storage1 }, { orgId: "o1", projectId: "p1" })
    ).rejects.toMatchObject({ message: "Proyecto no encontrado", status: 404 });

    const store2 = makeStore(projectRow(), null);
    const { storage: storage2 } = makeStorage({});
    await expect(
      generarPlantillas({ store: store2, storage: storage2 }, { orgId: "o1", projectId: "p1" })
    ).rejects.toMatchObject({ message: "El proyecto no tiene snapshot actual", status: 400 });

    const store3 = makeStore(projectRow(), snapshotRow());
    const { storage: storage3 } = makeStorage({});
    await expect(
      generarPlantillas({ store: store3, storage: storage3 }, { orgId: "o1", projectId: "p1" })
    ).rejects.toMatchObject({ message: "El proyecto no tiene página de entrada", status: 400 });
  });
});
