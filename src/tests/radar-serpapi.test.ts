import { describe, it, expect, vi, afterEach } from "vitest";
import { parseTrendingNow, parseRelatedQueries, buscarTendencias } from "@/src/blog/radar/serpapi";

afterEach(() => vi.unstubAllGlobals());

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
