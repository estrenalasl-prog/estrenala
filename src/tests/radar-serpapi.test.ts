import { describe, it, expect, vi, afterEach } from "vitest";
import { parseTrendingNow, parseRelatedQueries, buscarTendencias, probarConexionSerpApi } from "@/src/blog/radar/serpapi";

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


afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

describe("parseTrendingNow", () => {
  it("mapea query, volumen y crecimiento", () => {
    const out = parseTrendingNow({
      trending_searches: [
        { query: "ia generativa", search_volume: 50000, increase_percentage: 900 },
        { query: "  ", search_volume: 1 },
      ],
    });
    expect(out).toEqual([
      { keyword: "ia generativa", fuente: "trends", crecimientoPct: 900, volumenAprox: 50000 },
    ]);
  });
  it("tolera respuesta vacía o sin campos", () => {
    expect(parseTrendingNow({})).toEqual([]);
    expect(parseTrendingNow({ trending_searches: [{ query: "x" }] })[0]).toEqual({
      keyword: "x", fuente: "trends", crecimientoPct: null, volumenAprox: null,
    });
  });
});

describe("parseRelatedQueries", () => {
  it("mapea las consultas en alza (rising)", () => {
    const out = parseRelatedQueries({
      related_queries: { rising: [{ query: "agentes ia para pymes", extracted_value: 850 }] },
    });
    expect(out).toEqual([
      { keyword: "agentes ia para pymes", fuente: "related", crecimientoPct: 850, volumenAprox: null },
    ]);
  });
});

describe("buscarTendencias", () => {
  it("llama a SerpAPI con engine y geo y propaga errores de la API", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ error: "límite mensual agotado" }),
    });
    vi.stubGlobal("fetch", fetchMock);
    await expect(buscarTendencias("ES")).rejects.toThrow(/límite mensual/);
    const url = new URL(fetchMock.mock.calls[0][0]);
    expect(url.searchParams.get("engine")).toBe("google_trends_trending_now");
    expect(url.searchParams.get("geo")).toBe("ES");
  });
});

describe("probarConexionSerpApi", () => {
  it("devuelve las búsquedas restantes con clave válida", async () => {
    claves.serpapi = "clave-test";
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ total_searches_left: 87 }),
    });
    vi.stubGlobal("fetch", fetchMock);
    await expect(probarConexionSerpApi()).resolves.toContain("87");
    expect(String(fetchMock.mock.calls[0][0])).toContain("account.json");
  });

  it("propaga el error de la API (clave inválida)", async () => {
    claves.serpapi = "clave-mala";
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ error: "Invalid API key" }),
    }));
    await expect(probarConexionSerpApi()).rejects.toThrow(/Invalid API key/);
  });

  it("sin clave → mensaje de Configuración sin llamar a la red", async () => {
    claves.serpapi = "";
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    await expect(probarConexionSerpApi()).rejects.toThrow("Falta la clave de SerpAPI: añádela en Configuración");
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
