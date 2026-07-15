import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { BlogStore, KeywordNueva } from "@/src/repositories/blog";
import type { ProjectStore } from "@/src/repositories/types";
import { EditorError } from "@/src/editor/errors";

vi.mock("@/src/blog/radar/serpapi", () => ({
  buscarTendencias: vi.fn(),
  buscarRelacionadas: vi.fn(),
}));
vi.mock("@/src/ia/claude", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  pedirJson: vi.fn(),
}));

import { buscarTendencias, buscarRelacionadas } from "@/src/blog/radar/serpapi";
import { pedirJson } from "@/src/ia/claude";
import { actualizarRadar } from "@/src/blog/radar";

const ORG = "org-1";
const P = "p1";

type KwGuardada = KeywordNueva & { id: string; estado: string };

function fakes(opts: { nicho?: string; semillas?: string; modelo?: string } = {}) {
  const keywords: KwGuardada[] = [];
  const cache = new Set<string>();
  const blog = {
    async getBlogSettings() {
      return {
        nicho: opts.nicho ?? "IA y automatización para pymes",
        idioma: "es",
        modelo: opts.modelo ?? "",
        keywordsSemilla: opts.semillas ?? "agentes ia, automatización pymes",
      };
    },
    async insertKeywords(_o: string, _p: string, items: KeywordNueva[]) {
      // Mimetiza el UNIQUE (project, keyword) con onConflictDoNothing.
      for (const i of items) {
        if (!keywords.some((k) => k.keyword === i.keyword)) {
          keywords.push({ ...i, id: `kw-${keywords.length}`, estado: "nueva" });
        }
      }
    },
    async hayTrendsCache(_o: string, _p: string, fecha: string) {
      return cache.has(fecha);
    },
    async marcarTrendsCache(_o: string, _p: string, fecha: string) {
      cache.add(fecha);
    },
  } as unknown as BlogStore;

  const store = {
    async getProject() {
      return {
        id: P, orgId: ORG, nombre: "Quantiva", entryPath: "index.html",
        currentSnapshotId: "s1", subdominio: "quantiva", dominio: null,
        publishedSnapshotId: null, createdAt: "",
      };
    },
  } as unknown as ProjectStore;

  return { deps: { store, blog, orgId: ORG, projectId: P }, keywords, cache };
}

beforeEach(() => {
  vi.stubEnv("SERPAPI_KEY", "test-key");
  vi.stubEnv("SITES_BASE_DOMAIN", "wc.app");
  vi.mocked(buscarTendencias).mockReset().mockResolvedValue([
    { keyword: "ia generativa", fuente: "trends", crecimientoPct: 900, volumenAprox: 50000 },
    { keyword: "resultado futbol", fuente: "trends", crecimientoPct: 2000, volumenAprox: 100000 },
  ]);
  vi.mocked(buscarRelacionadas).mockReset().mockResolvedValue([
    { keyword: "agentes ia para pymes", fuente: "related", crecimientoPct: 850, volumenAprox: null },
  ]);
  vi.mocked(pedirJson).mockReset().mockResolvedValue({
    puntuaciones: [
      { keyword: "ia generativa", relevancia: 85 },
      { keyword: "resultado futbol", relevancia: 2 },
      { keyword: "agentes ia para pymes", relevancia: 95 },
    ],
  });
});
afterEach(() => vi.unstubAllEnvs());

describe("actualizarRadar", () => {
  it("guarda keywords puntuadas y descarta las irrelevantes (<20)", async () => {
    const f = fakes();
    const r = await actualizarRadar(f.deps);
    expect(r).toEqual({ actualizado: true, candidatos: 3 });
    expect(f.keywords.map((k) => k.keyword).sort()).toEqual(["agentes ia para pymes", "ia generativa"]);
    expect(f.keywords.find((k) => k.keyword === "agentes ia para pymes")!.relevancia).toBe(95);
  });

  it("usa la caché diaria: la segunda llamada del día no consume SerpAPI", async () => {
    const f = fakes();
    await actualizarRadar(f.deps);
    const r2 = await actualizarRadar(f.deps);
    expect(r2).toEqual({ actualizado: false });
    expect(vi.mocked(buscarTendencias)).toHaveBeenCalledTimes(1);
  });

  it("con forzar=true vuelve a consultar y no duplica keywords", async () => {
    const f = fakes();
    await actualizarRadar(f.deps);
    await actualizarRadar(f.deps, true);
    expect(f.keywords).toHaveLength(2);
    expect(vi.mocked(buscarTendencias)).toHaveBeenCalledTimes(2);
  });

  it("una consulta de SerpAPI que falla no aborta el radar", async () => {
    const f = fakes();
    vi.mocked(buscarRelacionadas).mockReset()
      .mockRejectedValue(new Error("Google Trends hasn't returned any results for this query."));
    const r = await actualizarRadar(f.deps);
    expect(r.actualizado).toBe(true);
    expect(f.keywords.map((k) => k.keyword)).toEqual(["ia generativa"]);
  });

  it("si TODAS las consultas fallan, lanza EditorError 502 con la última causa", async () => {
    const f = fakes();
    vi.mocked(buscarTendencias).mockReset().mockRejectedValue(new Error("sin datos"));
    vi.mocked(buscarRelacionadas).mockReset().mockRejectedValue(new Error("sin datos"));
    const err = await actualizarRadar(f.deps).catch((e) => e);
    expect(err).toBeInstanceOf(EditorError);
    expect((err as EditorError).status).toBe(502);
    expect((err as Error).message).toMatch(/SerpAPI no devolvió ninguna keyword \(última causa: sin datos\)/);
  });

  it("sin nicho → 400 byte-exacto y no gasta nada", async () => {
    const f = fakes({ nicho: "  " });
    await expect(actualizarRadar(f.deps)).rejects.toThrow("Configura primero de qué va tu blog (campo Nicho)");
    expect(vi.mocked(buscarTendencias)).not.toHaveBeenCalled();
  });

  it("sin clave de SerpAPI (ni UI ni .env) → 500 byte-exacto y no gasta nada", async () => {
    vi.stubEnv("SERPAPI_KEY", "");
    const f = fakes();
    const err = await actualizarRadar(f.deps).catch((e) => e);
    expect(err).toBeInstanceOf(EditorError);
    expect((err as EditorError).status).toBe(500);
    expect((err as Error).message).toBe("Falta la clave de SerpAPI: añádela en Configuración");
    expect(vi.mocked(buscarTendencias)).not.toHaveBeenCalled();
  });

  it("el prompt lleva nombre y nicho y pedirJson recibe el modelo del proyecto", async () => {
    const f = fakes({ modelo: "proveedor/modelo-barato" });
    await actualizarRadar(f.deps);
    const prompt = vi.mocked(pedirJson).mock.calls[0][0] as string;
    expect(prompt).toContain("Quantiva");
    expect(prompt).toContain("IA y automatización para pymes");
    expect(prompt).toContain("- ia generativa");
    expect(vi.mocked(pedirJson).mock.calls[0][3]).toBe("proveedor/modelo-barato");
  });

  it("consulta como mucho 3 semillas (máx. 4 créditos por actualización)", async () => {
    const f = fakes({ semillas: "a, b, c, d, e" });
    await actualizarRadar(f.deps);
    expect(vi.mocked(buscarRelacionadas)).toHaveBeenCalledTimes(3);
  });
});
