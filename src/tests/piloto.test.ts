import { describe, it, expect, vi, beforeEach } from "vitest";
import { EditorError } from "@/src/editor/errors";
import type { ProjectStore } from "@/src/repositories/types";
import type { StorageAdapter } from "@/src/storage/types";
import type { BlogStore, DraftRow, KeywordRow, Piloto } from "@/src/repositories/blog";

// El piloto ORQUESTA piezas ya probadas en sus suites: aquí se mockean todas
// para probar solo la lógica del runner (cuándo corre, qué registra, qué gasta).
vi.mock("@/src/blog/radar", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  actualizarRadar: vi.fn(),
}));
vi.mock("@/src/blog/pipeline", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  ejecutarEtapa: vi.fn(),
}));
vi.mock("@/src/blog/portada", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  generarPortada: vi.fn(),
}));
vi.mock("@/src/blog/programados", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  programarPost: vi.fn(),
}));
vi.mock("@/src/config/claves", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  claveOpenRouter: vi.fn(),
  claveSerpApi: vi.fn(),
}));

import { actualizarRadar } from "@/src/blog/radar";
import { ejecutarEtapa } from "@/src/blog/pipeline";
import { generarPortada } from "@/src/blog/portada";
import { programarPost } from "@/src/blog/programados";
import { claveOpenRouter, claveSerpApi } from "@/src/config/claves";
import { pilotoTick } from "@/src/blog/piloto";

const ORG = "o1";
const P = "p1";
// Un "ahora" controlado: 2026-07-16 a las 10:00 (hora local del test).
const AHORA = new Date(2026, 6, 16, 10, 0, 0);

function fakes(opts: {
  pilotos?: Partial<Piloto & { projectId: string; orgId: string }>[];
  keywords?: Partial<KeywordRow>[];
} = {}) {
  const pilotos = (opts.pilotos ?? []).map((p, i) => ({
    projectId: p.projectId ?? P, orgId: ORG, activo: true, cadaDias: 1, hora: 9,
    portada: "diseno", ultimoDia: null, ultimoMsg: null, ...p,
  }));
  const keywords: KeywordRow[] = (opts.keywords ?? []).map((k, i) => ({
    id: `kw-${i}`, projectId: P, keyword: k.keyword ?? `tema ${i}`, fuente: "trends",
    crecimientoPct: null, volumenAprox: null, relevancia: 0, estado: "nueva",
    discoveredAt: "", ...k,
  }));
  const drafts = new Map<string, DraftRow>();
  const registros: string[] = [];
  const estadosKw: { id: string; estado: string }[] = [];
  let borrados = 0;

  const blog = {
    async listPilotosActivos() { return pilotos; },
    async reclamarPiloto(projectId: string, dia: string) {
      const p = pilotos.find((x) => x.projectId === projectId);
      if (!p || p.ultimoDia === dia) return false;
      p.ultimoDia = dia;
      return true;
    },
    async registrarPiloto(_p: string, msg: string) { registros.push(msg); },
    async listKeywords() { return keywords; },
    async setKeywordEstado(_o: string, _p: string, id: string, estado: string) {
      estadosKw.push({ id, estado });
      return true;
    },
    async createDraft(_o: string, _p: string, keyword: string) {
      const d: DraftRow = {
        id: "draft-1", projectId: P, keyword, analisisJson: null, planMd: null,
        investigacionMd: null, articuloMd: null, linksHechos: 0, titulo: null,
        slug: null, metaDescripcion: null, estado: "pipeline", errorMsg: null,
        createdAt: "", updatedAt: "",
      };
      drafts.set(d.id, d);
      return { draftId: d.id };
    },
    async getDraft(_o: string, _p: string, id: string) { return drafts.get(id) ?? null; },
    async deleteDraft() { borrados++; },
  } as unknown as BlogStore;

  // El mock de ejecutarEtapa "completa" la etapa pedida en el draft del fake,
  // para que el bucle con el siguienteEtapa REAL avance como en producción.
  vi.mocked(ejecutarEtapa).mockImplementation(async (_deps, draftId, etapa) => {
    const d = drafts.get(draftId)!;
    if (etapa === "analisis") d.analisisJson = "{}";
    if (etapa === "plan") d.planMd = "plan";
    if (etapa === "investigacion") d.investigacionMd = "inv";
    if (etapa === "redaccion") d.articuloMd = "## Artículo del piloto";
    if (etapa === "links") d.linksHechos = 1;
    if (etapa === "metadatos") { d.titulo = "Título Piloto"; d.slug = "titulo-piloto"; d.metaDescripcion = "Meta."; d.estado = "revision"; }
    return { ok: true as const };
  });

  return {
    deps: { store: {} as ProjectStore, blog, storage: {} as StorageAdapter },
    pilotos, registros, estadosKw, drafts, borrados: () => borrados,
  };
}

beforeEach(() => {
  vi.mocked(actualizarRadar).mockReset().mockResolvedValue({ actualizado: false });
  vi.mocked(ejecutarEtapa).mockReset();
  vi.mocked(generarPortada).mockReset().mockResolvedValue({ assetId: "asset-1", url: "/api/x" });
  vi.mocked(programarPost).mockReset().mockResolvedValue({ programadoId: "prog-1" });
  vi.mocked(claveOpenRouter).mockReset().mockResolvedValue("sk-or-v1-test");
  vi.mocked(claveSerpApi).mockReset().mockResolvedValue("serp-test");
});

describe("pilotoTick: cuándo corre", () => {
  it("sin pilotos activos no hace nada", async () => {
    const f = fakes();
    expect(await pilotoTick(f.deps, AHORA)).toEqual({ ejecutados: 0, publicados: 0 });
  });

  it("antes de la hora configurada no corre (y no reclama el día)", async () => {
    const f = fakes({ pilotos: [{ hora: 11 }] });
    expect(await pilotoTick(f.deps, AHORA)).toEqual({ ejecutados: 0, publicados: 0 });
    expect(f.pilotos[0].ultimoDia).toBeNull();
  });

  it("respeta la frecuencia: con cadaDias=3 y último hace 1 día no corre; hace 3 días sí", async () => {
    const f1 = fakes({ pilotos: [{ cadaDias: 3, ultimoDia: "2026-07-15" }] });
    expect((await pilotoTick(f1.deps, AHORA)).ejecutados).toBe(0);
    const f2 = fakes({ pilotos: [{ cadaDias: 3, ultimoDia: "2026-07-13" }], keywords: [{ relevancia: 85 }] });
    expect((await pilotoTick(f2.deps, AHORA)).ejecutados).toBe(1);
  });

  it("dos ticks el mismo día: el segundo no reclama ni re-ejecuta", async () => {
    const f = fakes({ pilotos: [{}], keywords: [{ relevancia: 85 }] });
    await pilotoTick(f.deps, AHORA);
    expect(await pilotoTick(f.deps, AHORA)).toEqual({ ejecutados: 0, publicados: 0 });
    expect(vi.mocked(programarPost)).toHaveBeenCalledTimes(1);
  });
});

describe("pilotoTick: guardas de gasto", () => {
  it("sin clave de OpenRouter registra byte-exacto y NO llama al radar", async () => {
    vi.mocked(claveOpenRouter).mockResolvedValue("");
    const f = fakes({ pilotos: [{}] });
    await pilotoTick(f.deps, AHORA);
    expect(f.registros).toEqual(["El piloto no arrancó: falta la clave de OpenRouter (Configuración)"]);
    expect(vi.mocked(actualizarRadar)).not.toHaveBeenCalled();
  });

  it("sin clave de SerpAPI registra byte-exacto y NO llama al radar", async () => {
    vi.mocked(claveSerpApi).mockResolvedValue("");
    const f = fakes({ pilotos: [{}] });
    await pilotoTick(f.deps, AHORA);
    expect(f.registros).toEqual(["El piloto no arrancó: falta la clave de SerpAPI (Configuración)"]);
    expect(vi.mocked(actualizarRadar)).not.toHaveBeenCalled();
  });

  it("un error del radar queda registrado con su mensaje", async () => {
    vi.mocked(actualizarRadar).mockRejectedValue(new EditorError("Configura primero de qué va tu blog (campo Nicho)", 400));
    const f = fakes({ pilotos: [{}] });
    await pilotoTick(f.deps, AHORA);
    expect(f.registros).toEqual(["El piloto falló: Configura primero de qué va tu blog (campo Nicho)"]);
  });

  it("sin tema con relevancia > 60 registra byte-exacto y NO crea borrador (60 justo no vale; usadas no cuentan)", async () => {
    const f = fakes({
      pilotos: [{}],
      keywords: [{ relevancia: 60 }, { relevancia: 90, estado: "usada" }, { relevancia: 55 }],
    });
    const r = await pilotoTick(f.deps, AHORA);
    expect(r).toEqual({ ejecutados: 1, publicados: 0 });
    expect(f.registros).toEqual(["Hoy no había ningún tema con relevancia > 60: no se gastó nada en redactar"]);
    expect(f.drafts.size).toBe(0);
  });
});

describe("pilotoTick: la ejecución completa", () => {
  it("camino feliz: radar → 6 etapas → usada → portada → programado a +5 min → borrador fuera → registro", async () => {
    const f = fakes({ pilotos: [{}], keywords: [{ keyword: "agentes ia", relevancia: 85 }] });
    const r = await pilotoTick(f.deps, AHORA);
    expect(r).toEqual({ ejecutados: 1, publicados: 1 });
    expect(vi.mocked(actualizarRadar)).toHaveBeenCalledTimes(1);
    expect(vi.mocked(ejecutarEtapa)).toHaveBeenCalledTimes(6);
    expect(f.estadosKw).toEqual([{ id: "kw-0", estado: "usada" }]);
    expect(vi.mocked(generarPortada).mock.calls[0][1]).toMatchObject({ titulo: "Título Piloto", modo: "diseno" });
    const prog = vi.mocked(programarPost).mock.calls[0][1] as Record<string, unknown>;
    expect(prog).toMatchObject({
      orgId: ORG, projectId: P, titulo: "Título Piloto", slug: "titulo-piloto",
      metaDescripcion: "Meta.", md: "## Artículo del piloto", imagenAssetId: "asset-1",
    });
    expect(prog.publicarEn).toBe(new Date(AHORA.getTime() + 5 * 60_000).toISOString());
    expect(f.borrados()).toBe(1);
    expect(f.registros).toEqual(["Artículo «Título Piloto» programado (tema: agentes ia, relevancia 85)"]);
  });

  it("una etapa que falla conserva el borrador, registra y no programa nada", async () => {
    const f = fakes({ pilotos: [{}], keywords: [{ relevancia: 85 }] });
    // Sustituye la implementación del fake: la 3ª etapa (investigacion) revienta.
    const completar = vi.mocked(ejecutarEtapa).getMockImplementation()!;
    vi.mocked(ejecutarEtapa).mockImplementation(async (deps, draftId, etapa) => {
      if (etapa === "investigacion") return { ok: false as const, error: "OpenRouter HTTP 500" };
      return completar(deps, draftId, etapa);
    });
    const r = await pilotoTick(f.deps, AHORA);
    expect(r).toEqual({ ejecutados: 1, publicados: 0 });
    expect(f.registros).toEqual(["El borrador quedó en error en la etapa investigacion: OpenRouter HTTP 500 (revísalo en el panel del blog)"]);
    expect(vi.mocked(generarPortada)).not.toHaveBeenCalled();
    expect(vi.mocked(programarPost)).not.toHaveBeenCalled();
    expect(f.borrados()).toBe(0);
  });

  it("si la portada IA falla, cae al diseño gratis y sigue", async () => {
    const f = fakes({ pilotos: [{ portada: "ia" }], keywords: [{ relevancia: 85 }] });
    vi.mocked(generarPortada)
      .mockRejectedValueOnce(new EditorError("Tu cuenta de OpenRouter no tiene saldo. Añade crédito en openrouter.ai/settings/credits e inténtalo de nuevo.", 402))
      .mockResolvedValueOnce({ assetId: "asset-diseno", url: "/api/y" });
    const r = await pilotoTick(f.deps, AHORA);
    expect(r).toEqual({ ejecutados: 1, publicados: 1 });
    expect(vi.mocked(generarPortada).mock.calls[0][1]).toMatchObject({ modo: "ia" });
    expect(vi.mocked(generarPortada).mock.calls[1][1]).toMatchObject({ modo: "diseno" });
    expect((vi.mocked(programarPost).mock.calls[0][1] as Record<string, unknown>).imagenAssetId).toBe("asset-diseno");
  });

  it("si programar falla (p. ej. slug duplicado), registra y conserva el borrador", async () => {
    const f = fakes({ pilotos: [{}], keywords: [{ relevancia: 85 }] });
    vi.mocked(programarPost).mockRejectedValue(new EditorError('El slug "titulo-piloto" ya existe en este sitio', 400));
    const r = await pilotoTick(f.deps, AHORA);
    expect(r).toEqual({ ejecutados: 1, publicados: 0 });
    expect(f.registros).toEqual(['No se pudo programar el artículo: El slug "titulo-piloto" ya existe en este sitio (el borrador sigue en el panel)']);
    expect(f.borrados()).toBe(0);
  });
});
