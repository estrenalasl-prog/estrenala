import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { EditorError } from "@/src/editor/errors";
import { MSG_SIN_PLANTILLA } from "@/src/blog/site-template";
import type { ProjectStore, ProjectRow } from "@/src/repositories/types";
import type { StorageAdapter } from "@/src/storage/types";
import type { BlogStore, ProgramadoRow, ProgramadoNuevo, ProgramadoResultado } from "@/src/repositories/blog";
import type { DeployTarget } from "@/src/publish/deploy-target";

// El runner orquesta guardarPost + publishSite (ya probados en sus suites);
// aquí se mockean para probar SOLO la orquestación: reclamo, resolución, fallos.
vi.mock("@/src/blog/apply", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  guardarPost: vi.fn(),
}));
vi.mock("@/src/publish/publish-site", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  publishSite: vi.fn(),
}));

import { guardarPost } from "@/src/blog/apply";
import { publishSite } from "@/src/publish/publish-site";
import { programarPost, publicarVencidos } from "@/src/blog/programados";

const ORG = "o1";
const P = "p1";

const TPL_POST =
  '<html><head><title>{{titulo}}</title><meta name="description" content="{{meta_descripcion}}">{{json_ld}}' +
  '<link rel="canonical" href="{{canonical}}"></head><body><img src="{{imagen}}" alt="{{titulo}}">' +
  "<p>{{fecha}}</p><article>{{contenido}}</article></body></html>";
const TPL_INDEX =
  '<html><body><!--POST--><div class="post"><a href="/blog/{{slug}}.html">{{titulo}}</a>' +
  "<p>{{meta_descripcion}}</p><span>{{fecha}}</span><img src=\"{{imagen}}\"></div><!--/POST--></body></html>";

const FUTURO = () => new Date(Date.now() + 3600_000).toISOString();
const PASADO = () => new Date(Date.now() - 3600_000).toISOString();

function fakes(opts: {
  tienePlantilla?: boolean;
  slugsPost?: string[];
  programados?: Partial<ProgramadoRow>[];
} = {}) {
  const project: ProjectRow = {
    id: P, orgId: ORG, nombre: "Mi Sitio", entryPath: "index.html",
    currentSnapshotId: "s1", subdominio: "mi-sitio", dominio: null,
    publishedSnapshotId: null, noIndexar: false, recogeFormularios: false, createdAt: "",
  };
  const store = {
    async getProject() { return project; },
    async getAsset(_o: string, _p: string, assetId: string) {
      if (assetId !== "cover") return null;
      return { id: "cover", projectId: P, storageKey: "assets/p1/cover.png", contentType: "image/png", bytes: 8, createdAt: "" };
    },
  } as unknown as ProjectStore;
  const storage = {
    async get(k: string) {
      return k === "assets/p1/cover.png" ? { body: Buffer.from("PNGBYTES"), contentType: "image/png" } : null;
    },
  } as unknown as StorageAdapter;

  const filas: ProgramadoRow[] = (opts.programados ?? []).map((p, i) => ({
    id: `prog-${i}`, projectId: P, titulo: `Programado ${i}`, slug: `programado-${i}`,
    metaDescripcion: "Meta corta.", md: "## Hola\n\nContenido.", imagenAssetId: "cover",
    publicarEn: PASADO(), estado: "pendiente", errorMsg: null, postId: null,
    createdAt: "", updatedAt: "", ...p,
  }));
  const creados: ProgramadoNuevo[] = [];
  const resueltos: { id: string; r: ProgramadoResultado }[] = [];
  const blog = {
    async getBlogTemplate() {
      return (opts.tienePlantilla ?? true) ? { tplPost: TPL_POST, tplIndex: TPL_INDEX } : null;
    },
    async listPosts() {
      return (opts.slugsPost ?? []).map((slug, i) => ({
        id: `post-${i}`, projectId: P, titulo: "Otro", slug, metaDescripcion: "m", md: "c",
        imagenAssetId: "cover", imagenExt: "png", fecha: "2026-07-01", createdAt: "", updatedAt: "",
      }));
    },
    async listProgramados() { return filas; },
    async crearProgramado(_o: string, _p: string, input: ProgramadoNuevo) {
      creados.push(input);
      return { programadoId: "prog-nuevo" };
    },
    // Mimetiza el reclamo real: solo pendientes vencidas, y quedan `publicando`.
    async reclamarProgramadosVencidos(limite: number) {
      const ahora = new Date().toISOString();
      const listas = filas.filter((f) => f.estado === "pendiente" && f.publicarEn <= ahora).slice(0, limite);
      for (const f of listas) f.estado = "publicando";
      return listas.map((f) => ({ ...f, orgId: ORG }));
    },
    async resolverProgramado(id: string, r: ProgramadoResultado) {
      resueltos.push({ id, r });
      const f = filas.find((x) => x.id === id);
      if (f) f.estado = r.estado;
    },
  } as unknown as BlogStore;

  const deploy = {} as DeployTarget;
  return { deps: { store, blog, storage }, depsRunner: { store, blog, storage, deploy }, creados, resueltos, filas };
}

function inputValido(overrides: Record<string, unknown> = {}) {
  return {
    orgId: ORG, projectId: P,
    titulo: "Mi Articulo Programado",
    slug: "mi-articulo-programado",
    metaDescripcion: "Meta descripcion corta de prueba.",
    md: "## Hola\n\nContenido de prueba.",
    imagenAssetId: "cover",
    publicarEn: FUTURO(),
    ...overrides,
  };
}

beforeEach(() => {
  vi.stubEnv("SITES_BASE_DOMAIN", "wc.test");
  vi.mocked(guardarPost).mockReset().mockResolvedValue({ postId: "post-x", snapshotId: "snap-x" });
  vi.mocked(publishSite).mockReset().mockResolvedValue({ subdominio: "mi-sitio", publishedSnapshotId: "snap-x" });
});
afterEach(() => vi.unstubAllEnvs());

describe("programarPost", () => {
  it("crea la fila con el contenido completo y la fecha normalizada a ISO", async () => {
    const f = fakes();
    const cuando = FUTURO();
    const r = await programarPost(f.deps, inputValido({ publicarEn: cuando }));
    expect(r).toEqual({ programadoId: "prog-nuevo" });
    expect(f.creados).toHaveLength(1);
    expect(f.creados[0]).toEqual({
      titulo: "Mi Articulo Programado",
      slug: "mi-articulo-programado",
      metaDescripcion: "Meta descripcion corta de prueba.",
      md: "## Hola\n\nContenido de prueba.",
      imagenAssetId: "cover",
      publicarEn: new Date(cuando).toISOString(),
    });
  });

  it("sin fecha o con fecha no parseable → 400 byte-exacto y no escribe fila", async () => {
    const f = fakes();
    for (const publicarEn of ["", "   ", "no-es-fecha"]) {
      const err = await programarPost(f.deps, inputValido({ publicarEn })).catch((e) => e);
      expect(err).toBeInstanceOf(EditorError);
      expect((err as EditorError).status).toBe(400);
      expect((err as Error).message).toBe("Elige fecha y hora para programar");
    }
    expect(f.creados).toHaveLength(0);
  });

  it("fecha pasada → 400 «La fecha de publicación debe ser futura»", async () => {
    const f = fakes();
    const err = await programarPost(f.deps, inputValido({ publicarEn: PASADO() })).catch((e) => e);
    expect(err).toBeInstanceOf(EditorError);
    expect((err as EditorError).status).toBe(400);
    expect((err as Error).message).toBe("La fecha de publicación debe ser futura");
    expect(f.creados).toHaveLength(0);
  });

  it("sin plantilla → 400 con el mensaje estándar", async () => {
    const f = fakes({ tienePlantilla: false });
    await expect(programarPost(f.deps, inputValido())).rejects.toThrow(MSG_SIN_PLANTILLA);
    expect(f.creados).toHaveLength(0);
  });

  it("imagen inexistente → 400 «Falta la imagen de portada»", async () => {
    const f = fakes();
    const err = await programarPost(f.deps, inputValido({ imagenAssetId: "no-existe" })).catch((e) => e);
    expect(err).toBeInstanceOf(EditorError);
    expect((err as Error).message).toContain("Falta la imagen de portada");
    expect(f.creados).toHaveLength(0);
  });

  it("slug ya usado por un post publicado → 400", async () => {
    const f = fakes({ slugsPost: ["mi-articulo-programado"] });
    const err = await programarPost(f.deps, inputValido()).catch((e) => e);
    expect((err as Error).message).toContain('El slug "mi-articulo-programado" ya existe en este sitio');
    expect(f.creados).toHaveLength(0);
  });

  it("slug ya usado por OTRA programación pendiente → 400; una publicada o fallida no bloquea", async () => {
    const bloqueada = fakes({ programados: [{ slug: "mi-articulo-programado", estado: "pendiente", publicarEn: FUTURO() }] });
    const err = await programarPost(bloqueada.deps, inputValido()).catch((e) => e);
    expect((err as Error).message).toContain('El slug "mi-articulo-programado" ya existe en este sitio');
    expect(bloqueada.creados).toHaveLength(0);

    const libre = fakes({ programados: [
      { slug: "mi-articulo-programado", estado: "publicado" },
      { slug: "mi-articulo-programado", estado: "error" },
    ] });
    await expect(programarPost(libre.deps, inputValido())).resolves.toEqual({ programadoId: "prog-nuevo" });
  });

  it("título demasiado largo → mismo mensaje que guardarPost", async () => {
    const f = fakes();
    const err = await programarPost(f.deps, inputValido({ titulo: "x".repeat(301) })).catch((e) => e);
    expect((err as Error).message).toBe("El título es demasiado largo (máx. 300 caracteres)");
    expect(f.creados).toHaveLength(0);
  });
});

describe("publicarVencidos", () => {
  it("publica las vencidas: guardarPost con el contenido de la fila + publishSite + fila publicada", async () => {
    const f = fakes({ programados: [{ publicarEn: PASADO() }, { publicarEn: PASADO() }] });
    const r = await publicarVencidos(f.depsRunner);
    expect(r).toEqual({ publicados: 2, errores: 0 });
    expect(vi.mocked(guardarPost)).toHaveBeenCalledTimes(2);
    expect(vi.mocked(guardarPost).mock.calls[0][1]).toMatchObject({
      orgId: ORG, projectId: P, titulo: "Programado 0", slug: "programado-0",
      metaDescripcion: "Meta corta.", md: "## Hola\n\nContenido.", imagenAssetId: "cover",
    });
    expect(vi.mocked(publishSite)).toHaveBeenCalledTimes(2);
    expect(vi.mocked(publishSite).mock.calls[0][1]).toEqual({ orgId: ORG, projectId: P });
    expect(f.resueltos).toEqual([
      { id: "prog-0", r: { estado: "publicado", postId: "post-x" } },
      { id: "prog-1", r: { estado: "publicado", postId: "post-x" } },
    ]);
  });

  it("las futuras ni se tocan", async () => {
    const f = fakes({ programados: [{ publicarEn: FUTURO() }] });
    const r = await publicarVencidos(f.depsRunner);
    expect(r).toEqual({ publicados: 0, errores: 0 });
    expect(vi.mocked(guardarPost)).not.toHaveBeenCalled();
    expect(f.resueltos).toHaveLength(0);
  });

  it("un fallo marca SU fila como error con el mensaje y sigue con las demás", async () => {
    const f = fakes({ programados: [{ publicarEn: PASADO() }, { publicarEn: PASADO() }] });
    vi.mocked(guardarPost)
      .mockRejectedValueOnce(new EditorError('El slug "programado-0" ya existe en este sitio', 400))
      .mockResolvedValueOnce({ postId: "post-x", snapshotId: "snap-x" });
    const r = await publicarVencidos(f.depsRunner);
    expect(r).toEqual({ publicados: 1, errores: 1 });
    expect(vi.mocked(publishSite)).toHaveBeenCalledTimes(1); // solo para la que se guardó
    expect(f.resueltos).toEqual([
      { id: "prog-0", r: { estado: "error", errorMsg: 'El slug "programado-0" ya existe en este sitio' } },
      { id: "prog-1", r: { estado: "publicado", postId: "post-x" } },
    ]);
  });

  it("si publicar el sitio falla, la fila queda en error (el contenido no se pierde)", async () => {
    const f = fakes({ programados: [{ publicarEn: PASADO() }] });
    vi.mocked(publishSite).mockRejectedValue(new Error("deploy caído"));
    const r = await publicarVencidos(f.depsRunner);
    expect(r).toEqual({ publicados: 0, errores: 1 });
    expect(f.resueltos).toEqual([{ id: "prog-0", r: { estado: "error", errorMsg: "deploy caído" } }]);
  });

  it("dos pasadas seguidas no publican dos veces (el reclamo respeta el estado)", async () => {
    const f = fakes({ programados: [{ publicarEn: PASADO() }] });
    await publicarVencidos(f.depsRunner);
    const r2 = await publicarVencidos(f.depsRunner);
    expect(r2).toEqual({ publicados: 0, errores: 0 });
    expect(vi.mocked(guardarPost)).toHaveBeenCalledTimes(1);
  });
});
