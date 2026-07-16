import { describe, it, expect, vi, beforeEach } from "vitest";
import { EditorError } from "@/src/editor/errors";
import { paletaPara } from "@/src/blog/portada/colores";
import type { ProjectStore, ProjectRow } from "@/src/repositories/types";
import type { StorageAdapter } from "@/src/storage/types";
import type { BlogStore } from "@/src/repositories/blog";

vi.mock("@/src/ia/claude", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  pedirImagen: vi.fn(),
}));
vi.mock("@/src/config/claves", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  claveOpenRouter: vi.fn(),
}));

import { pedirImagen, OpenRouterError } from "@/src/ia/claude";
import { claveOpenRouter } from "@/src/config/claves";
import { generarPortada } from "@/src/blog/portada";

const ORG = "o1";
const P = "p1";

function fakes(opts: { archivos?: Record<string, string>; conProyecto?: boolean } = {}) {
  const project: ProjectRow = {
    id: P, orgId: ORG, nombre: "Mi Sitio", entryPath: "index.html",
    currentSnapshotId: "s1", subdominio: "mi-sitio", dominio: null,
    publishedSnapshotId: null, createdAt: "",
  };
  const guardados: { key: string; contentType?: string; body: Buffer }[] = [];
  const assets: { assetId: string; contentType: string }[] = [];
  const store = {
    async getProject() { return opts.conProyecto === false ? null : project; },
    async getCurrentSnapshot() { return { id: "s1", projectId: P, tipo: "edit", storagePrefix: "p/s1/" }; },
    async createAsset(i: { assetId: string; contentType: string }) { assets.push(i); },
  } as unknown as ProjectStore;
  const storage = {
    async list(prefix: string) { return Object.keys(opts.archivos ?? {}).filter((k) => k.startsWith(prefix)); },
    async get(k: string) {
      const c = (opts.archivos ?? {})[k];
      return c === undefined ? null : { body: Buffer.from(c), contentType: "text/plain" };
    },
    async put(key: string, body: Buffer | string, contentType?: string) {
      guardados.push({ key, contentType, body: Buffer.isBuffer(body) ? body : Buffer.from(body) });
    },
  } as unknown as StorageAdapter;
  const blog = {
    async getBlogSettings() { return { nicho: "IA y automatización para pymes", idioma: "es", keywordsSemilla: "" }; },
  } as unknown as BlogStore;
  return { deps: { store, blog, storage }, guardados, assets };
}

const input = (extra: Record<string, unknown> = {}) => ({
  orgId: ORG, projectId: P, titulo: "Automatiza tu pyme", modo: "diseno" as const, ...extra,
});

beforeEach(() => {
  vi.mocked(pedirImagen).mockReset().mockResolvedValue({ bytes: Buffer.from("PNGBYTES"), contentType: "image/png" });
  vi.mocked(claveOpenRouter).mockReset().mockResolvedValue("sk-or-v1-test");
});

describe("generarPortada modo diseno", () => {
  it("compone el SVG con los colores del css del sitio y lo guarda como asset", async () => {
    const f = fakes({
      archivos: {
        "p/s1/styles.css": ".a{color:#e11d48}.b{background:#e11d48}.c{border-color:#e11d48}.d{color:#0ea5e9}.e{color:#0ea5e9}",
        "p/s1/index.html": "<html><body>hola</body></html>",
      },
    });
    const r = await generarPortada(f.deps, input());
    expect(r.assetId).toBeTruthy();
    expect(r.url).toBe(`/api/projects/${P}/assets/${r.assetId}.svg`);
    expect(f.guardados).toHaveLength(1);
    const svg = f.guardados[0].body.toString();
    expect(f.guardados[0].contentType).toBe("image/svg+xml");
    expect(svg).toContain("#e11d48");
    expect(svg).toContain("#0ea5e9");
    expect(svg).toContain("Automatiza tu pyme");
    expect(svg).toContain("Mi Sitio");
    expect(f.assets[0].contentType).toBe("image/svg+xml");
  });

  it("sin colores útiles en el sitio usa la paleta curada del nombre (determinista)", async () => {
    const f = fakes({ archivos: { "p/s1/styles.css": ".a{color:#fff;background:#333}" } });
    await generarPortada(f.deps, input());
    const svg = f.guardados[0].body.toString();
    const [c1, c2] = paletaPara("Mi Sitio");
    expect(svg).toContain(c1);
    expect(svg).toContain(c2);
  });

  it("no llama a la IA (cero coste)", async () => {
    const f = fakes();
    await generarPortada(f.deps, input());
    expect(vi.mocked(pedirImagen)).not.toHaveBeenCalled();
  });
});

describe("generarPortada validaciones", () => {
  it("proyecto inexistente → 404", async () => {
    const f = fakes({ conProyecto: false });
    const err = await generarPortada(f.deps, input()).catch((e) => e);
    expect(err).toBeInstanceOf(EditorError);
    expect((err as EditorError).status).toBe(404);
    expect((err as Error).message).toBe("Proyecto no encontrado");
  });

  it("sin título → 400 byte-exacto y no guarda nada", async () => {
    const f = fakes();
    const err = await generarPortada(f.deps, input({ titulo: "   " })).catch((e) => e);
    expect((err as EditorError).status).toBe(400);
    expect((err as Error).message).toBe("Escribe primero el título del artículo");
    expect(f.guardados).toHaveLength(0);
  });

  it("modo raro → 400 «Modo desconocido»", async () => {
    const f = fakes();
    const err = await generarPortada(f.deps, input({ modo: "magia" })).catch((e) => e);
    expect((err as EditorError).status).toBe(400);
    expect((err as Error).message).toBe("Modo desconocido");
  });
});

describe("generarPortada modo ia", () => {
  it("genera con el prompt (título + nicho + sin texto) y guarda el png devuelto", async () => {
    const f = fakes();
    const r = await generarPortada(f.deps, input({ modo: "ia" }));
    expect(r.url).toBe(`/api/projects/${P}/assets/${r.assetId}.png`);
    expect(f.guardados[0].body.toString()).toBe("PNGBYTES");
    expect(f.guardados[0].contentType).toBe("image/png");
    const prompt = vi.mocked(pedirImagen).mock.calls[0][0];
    expect(prompt).toContain("Automatiza tu pyme");
    expect(prompt).toContain("IA y automatización para pymes");
    expect(prompt).toContain("sin ningún texto");
  });

  it("sin clave de OpenRouter → 500 byte-exacto y no llama a la IA", async () => {
    vi.mocked(claveOpenRouter).mockResolvedValue("");
    const f = fakes();
    const err = await generarPortada(f.deps, input({ modo: "ia" })).catch((e) => e);
    expect((err as EditorError).status).toBe(500);
    expect((err as Error).message).toBe("Falta la clave de OpenRouter: añádela en Configuración");
    expect(vi.mocked(pedirImagen)).not.toHaveBeenCalled();
  });

  it("OpenRouter 402 → mensaje de saldo accionable", async () => {
    vi.mocked(pedirImagen).mockRejectedValue(new OpenRouterError(402, "OpenRouter HTTP 402: insufficient credits"));
    const f = fakes();
    const err = await generarPortada(f.deps, input({ modo: "ia" })).catch((e) => e);
    expect((err as EditorError).status).toBe(402);
    expect((err as Error).message).toBe("Tu cuenta de OpenRouter no tiene saldo. Añade crédito en openrouter.ai/settings/credits e inténtalo de nuevo.");
  });

  it("otro fallo → 502 con mensaje claro", async () => {
    vi.mocked(pedirImagen).mockRejectedValue(new Error("timeout"));
    const f = fakes();
    const err = await generarPortada(f.deps, input({ modo: "ia" })).catch((e) => e);
    expect((err as EditorError).status).toBe(502);
    expect((err as Error).message).toBe("No se pudo generar la portada, vuelve a intentarlo");
    expect(f.guardados).toHaveLength(0);
  });
});
