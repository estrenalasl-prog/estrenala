import { describe, it, expect, vi, beforeEach } from "vitest";
import type { BlogStore, DraftRow, DraftPatch, PostRow } from "@/src/repositories/blog";
import type { ProjectStore } from "@/src/repositories/types";
import { EditorError } from "@/src/editor/errors";

vi.mock("@/src/ia/claude", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  pedirTexto: vi.fn(),
  pedirJson: vi.fn(),
  pedirConBusquedaWeb: vi.fn(),
}));

import { pedirTexto, pedirJson, pedirConBusquedaWeb } from "@/src/ia/claude";
import { ejecutarEtapa, siguienteEtapa, ETAPAS } from "@/src/blog/pipeline";

const ORG = "org-1";
const PROJECT_ID = "p1";
const DRAFT_ID = "d1";

function draftBase(): DraftRow {
  return {
    id: DRAFT_ID,
    projectId: PROJECT_ID,
    keyword: "agentes ia para pymes",
    analisisJson: null,
    planMd: null,
    investigacionMd: null,
    articuloMd: null,
    linksHechos: 0,
    titulo: null,
    slug: null,
    metaDescripcion: null,
    estado: "pipeline",
    errorMsg: null,
    createdAt: "2026-07-10T00:00:00.000Z",
    updatedAt: "2026-07-10T00:00:00.000Z",
  };
}

function postDe(titulo: string, slug: string): PostRow {
  return {
    id: `post-${slug}`, projectId: PROJECT_ID, titulo, slug,
    metaDescripcion: "m", md: "## x", imagenAssetId: "a", imagenExt: "png",
    fecha: "2026-07-01", createdAt: "2026-07-01T00:00:00.000Z", updatedAt: "2026-07-01T00:00:00.000Z",
  };
}

function fakes(opts: { draft?: DraftRow | null; posts?: PostRow[]; nicho?: string } = {}) {
  const drafts = new Map<string, DraftRow>();
  if (opts.draft !== null) drafts.set(DRAFT_ID, opts.draft ?? draftBase());
  const posts = opts.posts ?? [];

  const blog = {
    async getBlogSettings() {
      return { nicho: opts.nicho ?? "IA para pymes", idioma: "es" };
    },
    async listPosts() {
      return posts;
    },
    async getDraft(_o: string, _p: string, id: string) {
      return drafts.get(id) ?? null;
    },
    async updateDraft(_o: string, _p: string, id: string, patch: DraftPatch) {
      const previa = drafts.get(id);
      if (previa) drafts.set(id, { ...previa, ...patch } as DraftRow);
    },
  } as unknown as BlogStore;

  const store = {
    async getProject() {
      return {
        id: PROJECT_ID, orgId: ORG, nombre: "Quantiva", entryPath: "index.html",
        currentSnapshotId: "s1", subdominio: "quantiva", dominio: null,
        publishedSnapshotId: null, createdAt: "",
      };
    },
  } as unknown as ProjectStore;

  const deps = { store, blog, orgId: ORG, projectId: PROJECT_ID };
  const draft = () => drafts.get(DRAFT_ID)!;
  return { deps, draft, drafts };
}

beforeEach(() => {
  vi.mocked(pedirJson).mockReset();
  vi.mocked(pedirTexto).mockReset().mockResolvedValue("texto generado");
  vi.mocked(pedirConBusquedaWeb).mockReset().mockResolvedValue("investigación con fuentes");
  vi.stubEnv("SITES_BASE_DOMAIN", "wc.app");
});

describe("ETAPAS y siguienteEtapa", () => {
  it("ETAPAS define el orden completo del spec", () => {
    expect(ETAPAS).toEqual(["analisis", "plan", "investigacion", "redaccion", "links", "metadatos"]);
  });

  it("avanza en orden según los artefactos presentes", () => {
    const d = draftBase();
    expect(siguienteEtapa(d)).toBe("analisis");
    d.analisisJson = "{}";
    expect(siguienteEtapa(d)).toBe("plan");
    d.planMd = "plan";
    d.investigacionMd = "inv";
    d.articuloMd = "articulo";
    expect(siguienteEtapa(d)).toBe("links");
    d.linksHechos = 1;
    expect(siguienteEtapa(d)).toBe("metadatos");
    d.titulo = "t"; d.slug = "s"; d.metaDescripcion = "m";
    expect(siguienteEtapa(d)).toBeNull();
  });
});

describe("ejecutarEtapa", () => {
  it("analisis guarda el JSON validado; el prompt lleva keyword y nicho", async () => {
    const f = fakes();
    vi.mocked(pedirJson).mockResolvedValue({
      keyword_principal: "agentes ia", keywords_secundarias: ["a", "b"], intencion_busqueda: "informativa",
    });
    const r = await ejecutarEtapa(f.deps, DRAFT_ID, "analisis");
    expect(r.ok).toBe(true);
    expect(JSON.parse(f.draft().analisisJson!).keyword_principal).toBe("agentes ia");
    const prompt = vi.mocked(pedirJson).mock.calls[0][0] as string;
    expect(prompt).toContain("agentes ia para pymes");
    expect(prompt).toContain("IA para pymes");
    expect(prompt).toContain("Quantiva");
  });

  it("borrador inexistente → EditorError 404 «Borrador no encontrado»", async () => {
    const f = fakes({ draft: null });
    await expect(ejecutarEtapa(f.deps, DRAFT_ID, "analisis")).rejects.toThrow(EditorError);
    await expect(ejecutarEtapa(f.deps, DRAFT_ID, "analisis")).rejects.toThrow("Borrador no encontrado");
  });

  it("rechaza una etapa si faltan las anteriores (mensaje byte-exacto)", async () => {
    const f = fakes();
    await expect(ejecutarEtapa(f.deps, DRAFT_ID, "redaccion")).rejects.toThrow(
      'Antes hay que completar la etapa "analisis"'
    );
  });

  it("si la etapa falla, marca estado error con [etapa] y conserva checkpoints", async () => {
    const d = draftBase();
    d.analisisJson = JSON.stringify({ keyword_principal: "x", keywords_secundarias: [], intencion_busqueda: "i" });
    const f = fakes({ draft: d });
    vi.mocked(pedirTexto).mockRejectedValue(new Error("API caída"));
    const r = await ejecutarEtapa(f.deps, DRAFT_ID, "plan");
    expect(r).toEqual({ ok: false, error: "API caída" });
    expect(f.draft().estado).toBe("error");
    expect(f.draft().errorMsg).toMatch(/\[plan\].*API caída/);
    expect(f.draft().analisisJson).not.toBeNull(); // checkpoint intacto
  });

  it("reintentar tras un error limpia errorMsg y vuelve a estado pipeline", async () => {
    const f = fakes();
    vi.mocked(pedirJson)
      .mockRejectedValueOnce(new Error("falla")) // pedirJson está mockeado entero: sin reintento interno
      .mockResolvedValue({ keyword_principal: "x", keywords_secundarias: [], intencion_busqueda: "y" });
    await ejecutarEtapa(f.deps, DRAFT_ID, "analisis");
    expect(f.draft().estado).toBe("error");
    await ejecutarEtapa(f.deps, DRAFT_ID, "analisis");
    expect(f.draft().estado).toBe("pipeline");
    expect(f.draft().errorMsg).toBeNull();
  });

  it("plan incluye los títulos ya guardados para no repetir tema", async () => {
    const d = draftBase();
    d.analisisJson = JSON.stringify({ keyword_principal: "k", keywords_secundarias: ["s1"], intencion_busqueda: "i" });
    const f = fakes({ draft: d, posts: [postDe("Cómo elegir CRM", "como-elegir-crm")] });
    await ejecutarEtapa(f.deps, DRAFT_ID, "plan");
    const prompt = vi.mocked(pedirTexto).mock.calls[0][0] as string;
    expect(prompt).toContain("Cómo elegir CRM");
    expect(f.draft().planMd).toBe("texto generado");
  });

  it("investigacion usa la búsqueda web y guarda investigacionMd", async () => {
    const d = draftBase();
    d.analisisJson = JSON.stringify({ keyword_principal: "k", keywords_secundarias: [], intencion_busqueda: "i" });
    d.planMd = "el plan";
    const f = fakes({ draft: d });
    await ejecutarEtapa(f.deps, DRAFT_ID, "investigacion");
    expect(f.draft().investigacionMd).toBe("investigación con fuentes");
    const prompt = vi.mocked(pedirConBusquedaWeb).mock.calls[0][0] as string;
    expect(prompt).toContain("el plan");
  });

  it("links sin posts previos marca linksHechos sin llamar a la IA", async () => {
    const d = draftBase();
    d.analisisJson = "{}"; d.planMd = "p"; d.investigacionMd = "i"; d.articuloMd = "a";
    const f = fakes({ draft: d });
    const r = await ejecutarEtapa(f.deps, DRAFT_ID, "links");
    expect(r.ok).toBe(true);
    expect(f.draft().linksHechos).toBe(1);
    expect(vi.mocked(pedirTexto)).not.toHaveBeenCalled();
  });

  it("links con posts previos pasa las URLs con la base pública", async () => {
    const d = draftBase();
    d.analisisJson = "{}"; d.planMd = "p"; d.investigacionMd = "i"; d.articuloMd = "articulo original";
    const f = fakes({ draft: d, posts: [postDe("Cómo elegir CRM", "como-elegir-crm")] });
    vi.mocked(pedirTexto).mockResolvedValue("articulo con enlaces");
    await ejecutarEtapa(f.deps, DRAFT_ID, "links");
    const prompt = vi.mocked(pedirTexto).mock.calls[0][0] as string;
    expect(prompt).toContain("https://quantiva.wc.app/blog/como-elegir-crm.html");
    expect(prompt).toContain("articulo original");
    expect(f.draft().articuloMd).toBe("articulo con enlaces");
    expect(f.draft().linksHechos).toBe(1);
  });

  it("metadatos normaliza y deduplica el slug y pasa el borrador a revision", async () => {
    const d = draftBase();
    d.analisisJson = JSON.stringify({ keyword_principal: "agentes ia", keywords_secundarias: [], intencion_busqueda: "i" });
    d.planMd = "p"; d.investigacionMd = "i"; d.articuloMd = "a"; d.linksHechos = 1;
    const f = fakes({ draft: d, posts: [postDe("Agentes IA", "agentes-ia")] });
    vi.mocked(pedirJson).mockResolvedValue({ titulo: "Agentes IA", slug: "Agentes ÍA!!", meta_descripcion: "m" });
    await ejecutarEtapa(f.deps, DRAFT_ID, "metadatos");
    const p = f.draft();
    expect(p.slug).toBe("agentes-ia-2"); // normalizado con slugify + deduplicado
    expect(p.titulo).toBe("Agentes IA");
    expect(p.estado).toBe("revision");
  });

  it("la instrucción del editor llega al prompt de la etapa", async () => {
    const f = fakes();
    vi.mocked(pedirJson).mockResolvedValue({ keyword_principal: "x", keywords_secundarias: [], intencion_busqueda: "y" });
    await ejecutarEtapa(f.deps, DRAFT_ID, "analisis", "hazlo más técnico");
    const prompt = vi.mocked(pedirJson).mock.calls[0][0] as string;
    expect(prompt).toContain("Instrucción adicional del editor: hazlo más técnico");
  });
});
