import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  recursosQueFaltan, plantillasDesdeHtml,
  MSG_VACIA, MSG_DEMASIADO_GRANDE, MSG_NO_ES_HTML, MSG_NO_SE_PUDO, LIMITE_PLANTILLA,
} from "@/src/blog/plantilla-propia";
import { MSG_SIN_CLAVE, MSG_SIN_SALDO } from "@/src/blog/site-template";
import { pedirJson } from "@/src/ia/claude";
import type { ProjectStore, ProjectRow, SnapshotRow } from "@/src/repositories/types";
import type { StorageAdapter } from "@/src/storage/types";

// Cada espacio paga SU clave: se sustituye el resolutor para no depender del entorno.
const claves = vi.hoisted(() => ({ openrouter: "sk-test", serpapi: "" }));
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

const PREFIX = "p/s1/";

function entorno(archivos: string[] = []) {
  const store = {
    async getProject(): Promise<ProjectRow> {
      return {
        id: "p1", orgId: "o1", nombre: "Mi Sitio", entryPath: "index.html", currentSnapshotId: "s1",
        subdominio: null, dominio: null, publishedSnapshotId: null, noIndexar: false, createdAt: "",
      };
    },
    async getCurrentSnapshot(): Promise<SnapshotRow> {
      return { id: "s1", projectId: "p1", storagePrefix: PREFIX, tipo: "edit" };
    },
  } as unknown as ProjectStore;
  const storage = {
    async list() { return archivos.map((a) => PREFIX + a); },
  } as unknown as StorageAdapter;
  return { store, storage };
}

const POST_OK = '<html><head><title>x</title></head><body><article>{{titulo}}{{meta_descripcion}}{{contenido}}</article></body></html>';
const INDEX_OK = '<html><body><!--POST-->{{titulo}}{{slug}}<!--/POST--></body></html>';
const ENTRADA = "<html><body><article><h1>Mi titular</h1><p>relleno</p></article></body></html>";

beforeEach(() => {
  claves.openrouter = "sk-test";
  vi.mocked(pedirJson).mockReset();
});

describe("recursosQueFaltan", () => {
  // Los artículos se sirven en /blog/, no en la raíz: una plantilla diseñada
  // suelta con su `estilos.css` al lado acaba buscando /blog/estilos.css.
  it("una ruta relativa se resuelve desde /blog/, que es donde vive el artículo", () => {
    const html = '<link rel="stylesheet" href="estilos.css">';
    expect(recursosQueFaltan(html, { rutas: new Set(["estilos.css"]), carpeta: "blog/" }))
      .toEqual(["blog/estilos.css"]);
  });

  it("una ruta desde la raíz que sí existe no se avisa", () => {
    const html = '<link rel="stylesheet" href="/css/app.css">';
    expect(recursosQueFaltan(html, { rutas: new Set(["css/app.css"]), carpeta: "blog/" })).toEqual([]);
  });

  it("no se queja de lo que está fuera: CDN, protocolo-relativa o data:", () => {
    const html = '<link rel="stylesheet" href="https://cdn.com/a.css">' +
      '<link rel="stylesheet" href="//cdn.com/b.css">' +
      '<script src="data:text/javascript,void0"></script>';
    expect(recursosQueFaltan(html, { rutas: new Set(), carpeta: "blog/" })).toEqual([]);
  });

  it("mira también los scripts, y colapsa el «..»", () => {
    const html = '<script src="../js/app.js"></script>';
    expect(recursosQueFaltan(html, { rutas: new Set(), carpeta: "blog/" })).toEqual(["js/app.js"]);
  });

  it("un <link> que no es hoja de estilo no cuenta", () => {
    const html = '<link rel="icon" href="/favicon.ico">';
    expect(recursosQueFaltan(html, { rutas: new Set(), carpeta: "blog/" })).toEqual([]);
  });

  it("ignora la query de cacheo al comparar", () => {
    const html = '<link rel="stylesheet" href="/css/app.css?v=3">';
    expect(recursosQueFaltan(html, { rutas: new Set(["css/app.css"]), carpeta: "blog/" })).toEqual([]);
  });
});

describe("plantillasDesdeHtml", () => {
  it("coloca los huecos sin que el usuario gaste en diseñar de cero", async () => {
    vi.mocked(pedirJson).mockResolvedValue({ plantilla_post: POST_OK, plantilla_index: INDEX_OK });
    const { store, storage } = entorno();
    const r = await plantillasDesdeHtml({ store, storage }, {
      orgId: "o1", projectId: "p1", htmlPost: ENTRADA,
    });
    expect(r.tplPost).toBe(POST_OK);
    expect(r.tplIndex).toBe(INDEX_OK);
    expect(r.avisos).toEqual([]);
  });

  it("le manda al modelo SU html y la orden de no rediseñar", async () => {
    vi.mocked(pedirJson).mockResolvedValue({ plantilla_post: POST_OK, plantilla_index: INDEX_OK });
    const { store, storage } = entorno();
    await plantillasDesdeHtml({ store, storage }, { orgId: "o1", projectId: "p1", htmlPost: ENTRADA });
    const prompt = vi.mocked(pedirJson).mock.calls[0][0] as string;
    expect(prompt).toContain(ENTRADA);
    expect(prompt).toContain("NO rediseñes nada");
  });

  it("avisa si la plantilla enlaza un CSS que no está en la web", async () => {
    vi.mocked(pedirJson).mockResolvedValue({
      plantilla_post: POST_OK.replace("<head>", '<head><link rel="stylesheet" href="/css/blog.css">'),
      plantilla_index: INDEX_OK,
    });
    const { store, storage } = entorno(["index.html"]); // no está css/blog.css
    const r = await plantillasDesdeHtml({ store, storage }, {
      orgId: "o1", projectId: "p1", htmlPost: ENTRADA,
    });
    expect(r.avisos).toHaveLength(1);
    expect(r.avisos[0]).toContain("css/blog.css");
    // Avisa, pero NO bloquea: la plantilla se devuelve igual.
    expect(r.tplPost).toContain("css/blog.css");
  });

  it("sin clave de OpenRouter no se llama a nadie", async () => {
    claves.openrouter = "";
    const { store, storage } = entorno();
    await expect(plantillasDesdeHtml({ store, storage }, {
      orgId: "o1", projectId: "p1", htmlPost: ENTRADA,
    })).rejects.toThrow(MSG_SIN_CLAVE);
    expect(vi.mocked(pedirJson)).not.toHaveBeenCalled();
  });

  it("sin saldo se dice qué hacer, no un error genérico", async () => {
    const { OpenRouterError } = await import("@/src/ia/claude") as unknown as {
      OpenRouterError: new (s: number, m: string) => Error;
    };
    vi.mocked(pedirJson).mockRejectedValue(new OpenRouterError(402, "no credits"));
    const { store, storage } = entorno();
    await expect(plantillasDesdeHtml({ store, storage }, {
      orgId: "o1", projectId: "p1", htmlPost: ENTRADA,
    })).rejects.toThrow(MSG_SIN_SALDO);
  });

  it("si al modelo se le olvida un hueco obligatorio, no se guarda una plantilla rota", async () => {
    vi.mocked(pedirJson).mockResolvedValue({
      plantilla_post: "<html><body><article>{{titulo}}</article></body></html>", // sin contenido
      plantilla_index: INDEX_OK,
    });
    const { store, storage } = entorno();
    await expect(plantillasDesdeHtml({ store, storage }, {
      orgId: "o1", projectId: "p1", htmlPost: ENTRADA,
    })).rejects.toThrow(MSG_NO_SE_PUDO);
  });

  describe("lo que se rechaza antes de gastar un céntimo", () => {
    it("vacío", async () => {
      const { store, storage } = entorno();
      await expect(plantillasDesdeHtml({ store, storage }, {
        orgId: "o1", projectId: "p1", htmlPost: "   ",
      })).rejects.toThrow(MSG_VACIA);
      expect(vi.mocked(pedirJson)).not.toHaveBeenCalled();
    });

    it("no es HTML", async () => {
      const { store, storage } = entorno();
      await expect(plantillasDesdeHtml({ store, storage }, {
        orgId: "o1", projectId: "p1", htmlPost: "hola que tal",
      })).rejects.toThrow(MSG_NO_ES_HTML);
      expect(vi.mocked(pedirJson)).not.toHaveBeenCalled();
    });

    it("demasiado grande (la respuesta se cortaría)", async () => {
      const { store, storage } = entorno();
      await expect(plantillasDesdeHtml({ store, storage }, {
        orgId: "o1", projectId: "p1", htmlPost: "<div>" + "x".repeat(LIMITE_PLANTILLA) + "</div>",
      })).rejects.toThrow(MSG_DEMASIADO_GRANDE);
      expect(vi.mocked(pedirJson)).not.toHaveBeenCalled();
    });
  });

  it("si no trae índice, se le pide construirlo con su mismo diseño", async () => {
    vi.mocked(pedirJson).mockResolvedValue({ plantilla_post: POST_OK, plantilla_index: INDEX_OK });
    const { store, storage } = entorno();
    await plantillasDesdeHtml({ store, storage }, { orgId: "o1", projectId: "p1", htmlPost: ENTRADA });
    const prompt = vi.mocked(pedirJson).mock.calls[0][0] as string;
    expect(prompt).toContain("NO ha traído índice");
  });
});
