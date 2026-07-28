import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  estadoBlog,
  guardarPost,
  borrarPost,
  guardarPlantillas,
  previewBlog,
} from "@/src/blog/apply";
import { validarPlantillas, MSG_SIN_PLANTILLA } from "@/src/blog/site-template";
import { DATOS_EJEMPLO, IMAGEN_EJEMPLO } from "@/src/blog/render";
import { snapshotPrefix } from "@/src/storage/keys";
import type { ProjectStore, ProjectRow, CreateSnapshotInput } from "@/src/repositories/types";
import type { StorageAdapter } from "@/src/storage/types";
import type { BlogStore, PostRow } from "@/src/repositories/blog";

const ORG = "o1";
const PROJECT_ID = "p1";

const TPL_POST =
  '<html><head><title>{{titulo}}</title><meta name="description" content="{{meta_descripcion}}">{{json_ld}}' +
  '<link rel="canonical" href="{{canonical}}"></head><body><img src="{{imagen}}" alt="{{titulo}}">' +
  "<p>{{fecha}}</p><article>{{contenido}}</article></body></html>";

const TPL_POST_V2 =
  '<html><head><title>{{titulo}}</title><meta name="description" content="{{meta_descripcion}}">{{json_ld}}' +
  '<link rel="canonical" href="{{canonical}}"></head><body><img src="{{imagen}}" alt="{{titulo}}">' +
  "<p>{{fecha}}</p><article>NUEVA-PLANTILLA {{contenido}}</article></body></html>";

const TPL_INDEX =
  '<html><body><!--POST--><div class="post"><a href="/blog/{{slug}}.html">{{titulo}}</a>' +
  "<p>{{meta_descripcion}}</p><span>{{fecha}}</span><img src=\"{{imagen}}\"></div><!--/POST--></body></html>";

function projectRow(overrides: Partial<ProjectRow> = {}): ProjectRow {
  return {
    id: PROJECT_ID,
    orgId: ORG,
    nombre: "Mi Sitio",
    entryPath: "index.html",
    currentSnapshotId: "s1",
    subdominio: "mi-sitio",
    dominio: null,
    publishedSnapshotId: null,
    noIndexar: false,
    createdAt: "",
    ...overrides,
  };
}

function fakes(opts: { project?: Partial<ProjectRow>; tienePlantilla?: boolean } = {}) {
  const { tienePlantilla = true } = opts;

  const archivos = new Map<string, { body: Buffer; contentType: string }>();
  archivos.set("p/s1/index.html", {
    body: Buffer.from("<html><head><title>Home</title></head><body>home</body></html>"),
    contentType: "text/html",
  });
  archivos.set("p/s1/sitemap.xml", {
    body: Buffer.from(
      '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
        "  <url>\n    <loc>https://otro-sitio.test/pagina.html</loc>\n    <lastmod>2024-01-01</lastmod>\n  </url>\n" +
        "</urlset>\n"
    ),
    contentType: "application/xml",
  });
  archivos.set("assets/p1/cover.png", { body: Buffer.from("PNGBYTES"), contentType: "image/png" });
  archivos.set("assets/p1/cover.jpg", { body: Buffer.from("JPEGBYTES"), contentType: "image/jpeg" });

  const puts: { path: string; contentType?: string }[] = [];
  const storage: StorageAdapter = {
    async put(k, b, ct) {
      archivos.set(k, { body: Buffer.isBuffer(b) ? b : Buffer.from(b), contentType: ct ?? "" });
      puts.push({ path: k, contentType: ct });
    },
    async get(k) {
      return archivos.get(k) ?? null;
    },
    async list(prefix) {
      return [...archivos.keys()].filter((k) => k.startsWith(prefix));
    },
    async delete(k) {
      archivos.delete(k);
    },
  };

  let project: ProjectRow = projectRow(opts.project);
  const snapshots: Record<string, { id: string; storagePrefix: string }> = {
    s1: { id: "s1", storagePrefix: "p/s1/" },
  };
  let current = "s1";
  const createSnapshotCalls: CreateSnapshotInput[] = [];

  const store: ProjectStore = {
    async getProject() {
      return project;
    },
    async getCurrentSnapshot() {
      return { ...snapshots[current], projectId: PROJECT_ID, tipo: "edit" };
    },
    async getAsset(_o: string, _p: string, assetId: string) {
      if (assetId === "cover") {
        return { id: "cover", projectId: PROJECT_ID, storageKey: "assets/p1/cover.png", contentType: "image/png", bytes: 8, createdAt: "" };
      }
      if (assetId === "cover-jpg") {
        return { id: "cover-jpg", projectId: PROJECT_ID, storageKey: "assets/p1/cover.jpg", contentType: "image/jpeg", bytes: 9, createdAt: "" };
      }
      return null;
    },
    async subdominioLibre() {
      return true;
    },
    async setSubdominio(_o: string, _p: string, sub: string) {
      project = { ...project, subdominio: sub };
      return true;
    },
    async createSnapshot(i: CreateSnapshotInput) {
      createSnapshotCalls.push(i);
      snapshots[i.snapshotId] = { id: i.snapshotId, storagePrefix: i.storagePrefix };
    },
    async setCurrentSnapshot(_o: string, _p: string, id: string) {
      current = id;
    },
  } as unknown as ProjectStore;

  let tpl: { tplPost: string; tplIndex: string } | null = tienePlantilla ? { tplPost: TPL_POST, tplIndex: TPL_INDEX } : null;
  const posts = new Map<string, PostRow>();
  let seq = 0;
  const blog: BlogStore = {
    async getBlogTemplate() {
      return tpl;
    },
    async setBlogTemplate(_o, _p, t) {
      tpl = t;
    },
    async listPosts() {
      return [...posts.values()].sort((a, b) => b.fecha.localeCompare(a.fecha) || b.createdAt.localeCompare(a.createdAt));
    },
    async getPost(_o, _p, id) {
      return posts.get(id) ?? null;
    },
    async createPost(_o, _p, input) {
      seq += 1;
      const id = `post-${seq}`;
      const now = new Date(Date.now() + seq).toISOString();
      posts.set(id, { id, projectId: PROJECT_ID, ...input, createdAt: now, updatedAt: now });
      return { postId: id };
    },
    async updatePost(_o, _p, id, input) {
      const previa = posts.get(id);
      if (!previa) return;
      posts.set(id, { ...previa, ...input, updatedAt: new Date().toISOString() });
    },
    async deletePost(_o, _p, id) {
      posts.delete(id);
    },
    // Borradores/settings del 4b: apply.ts no los usa; stubs mínimos.
    async getBlogSettings() {
      return null;
    },
    async setBlogSettings() {},
    async createDraft() {
      return { draftId: "draft-1" };
    },
    async getDraft() {
      return null;
    },
    async listDrafts() {
      return [];
    },
    async updateDraft() {},
    async deleteDraft() {},
    // Radar del 4c: apply.ts tampoco lo usa; stubs mínimos.
    async listKeywords() {
      return [];
    },
    async insertKeywords() {},
    async setKeywordEstado() {
      return false;
    },
    async hayTrendsCache() {
      return false;
    },
    async marcarTrendsCache() {},
    // Programados del 4e: apply.ts tampoco los usa; stubs mínimos.
    async crearProgramado() {
      return { programadoId: "prog-1" };
    },
    async listProgramados() {
      return [];
    },
    async borrarProgramado() {
      return false;
    },
    async reclamarProgramadosVencidos() {
      return [];
    },
    async resolverProgramado() {},
    // Piloto del 4g: apply.ts tampoco lo usa; stubs mínimos.
    async getPiloto() {
      return null;
    },
    async setPiloto() {},
    async listPilotosActivos() {
      return [];
    },
    async reclamarPiloto() {
      return false;
    },
    async registrarPiloto() {},
  };

  return { store, storage, blog, archivos, puts, createSnapshotCalls };
}

const deps = (f: ReturnType<typeof fakes>) => ({ store: f.store, blog: f.blog, storage: f.storage });

type GuardarPostInput = Parameters<typeof guardarPost>[1];
function validInput(overrides: Partial<GuardarPostInput> = {}): GuardarPostInput {
  return {
    orgId: ORG,
    projectId: PROJECT_ID,
    titulo: "Mi Primer Articulo",
    slug: "mi-primer-articulo",
    metaDescripcion: "Meta descripcion corta de prueba.",
    md: "## Hola\n\nContenido de prueba.",
    imagenAssetId: "cover",
    ...overrides,
  };
}

beforeEach(() => {
  vi.stubEnv("SITES_BASE_DOMAIN", "wc.test");
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.useRealTimers();
});

describe("guardarPost (crear)", () => {
  it("crea snapshot tipo 'blog' con blog/<slug>.html, blog/img/<slug>.<ext>, blog/index.html y sitemap.xml", async () => {
    const f = fakes();
    const r = await guardarPost(deps(f), validInput());
    const pref = snapshotPrefix(PROJECT_ID, r.snapshotId);
    expect(f.createSnapshotCalls[0].tipo).toBe("blog");
    const rutas = f.puts.map((p) => p.path);
    expect(rutas).toEqual(
      expect.arrayContaining([
        pref + "blog/mi-primer-articulo.html",
        pref + "blog/img/mi-primer-articulo.png",
        pref + "blog/index.html",
        pref + "sitemap.xml",
      ])
    );
  });

  it("deriva la ext del contentType del asset (image/jpeg → jpg)", async () => {
    const f = fakes();
    const r = await guardarPost(deps(f), validInput({ imagenAssetId: "cover-jpg" }));
    const pref = snapshotPrefix(PROJECT_ID, r.snapshotId);
    const img = await f.storage.get(pref + "blog/img/mi-primer-articulo.jpg");
    expect(img!.body.toString()).toBe("JPEGBYTES");
    expect(img!.contentType).toBe("image/jpeg");
  });

  it("el índice contiene el artículo y el sitemap ambas locs con la base pública", async () => {
    const f = fakes();
    const r = await guardarPost(deps(f), validInput());
    const pref = snapshotPrefix(PROJECT_ID, r.snapshotId);
    const indice = (await f.storage.get(pref + "blog/index.html"))!.body.toString();
    expect(indice).toContain("Mi Primer Articulo");
    expect(indice).toContain("/blog/mi-primer-articulo.html");
    const sitemap = (await f.storage.get(pref + "sitemap.xml"))!.body.toString();
    expect(sitemap).toContain("<loc>https://mi-sitio.wc.test/blog/mi-primer-articulo.html</loc>");
    expect(sitemap).toContain("<loc>https://mi-sitio.wc.test/blog/index.html</loc>");
    expect(sitemap).toContain("<loc>https://otro-sitio.test/pagina.html</loc>");
  });

  it("asigna subdominio si el proyecto no tiene ni dominio ni subdominio", async () => {
    const f = fakes({ project: { subdominio: null, dominio: null } });
    const r = await guardarPost(deps(f), validInput());
    const pref = snapshotPrefix(PROJECT_ID, r.snapshotId);
    const proyecto = await f.store.getProject(ORG, PROJECT_ID);
    expect(proyecto!.subdominio).toBe("mi-sitio");
    const sitemap = (await f.storage.get(pref + "sitemap.xml"))!.body.toString();
    expect(sitemap).toContain("<loc>https://mi-sitio.wc.test/blog/mi-primer-articulo.html</loc>");
  });

  it("validaciones: sin título/slug inválido/meta larga/sin imagen → 400 con join ' · '", async () => {
    const f = fakes();
    const esperado = [
      "Falta el título",
      "El slug solo puede llevar minúsculas, números y guiones",
      "La meta descripción tiene 161 caracteres (máximo 160)",
      "Falta la imagen de portada",
    ].join(" · ");
    await expect(
      guardarPost(
        deps(f),
        validInput({
          titulo: "",
          slug: "Slug Invalido",
          metaDescripcion: "a".repeat(161),
          imagenAssetId: "",
        })
      )
    ).rejects.toMatchObject({ message: esperado, status: 400 });
  });

  it('slug duplicado → «El slug "x" ya existe en este sitio»', async () => {
    const f = fakes();
    const d = deps(f);
    await guardarPost(d, validInput({ slug: "articulo-existente" }));
    await expect(guardarPost(d, validInput({ slug: "articulo-existente", titulo: "Otro" }))).rejects.toMatchObject({
      message: 'El slug "articulo-existente" ya existe en este sitio',
      status: 400,
    });
  });

  it("sin plantilla → 400 MSG_SIN_PLANTILLA", async () => {
    const f = fakes({ tienePlantilla: false });
    await expect(guardarPost(deps(f), validInput())).rejects.toMatchObject({ message: MSG_SIN_PLANTILLA, status: 400 });
  });

  it("límites: md>200000 / titulo>300 / slug>100 → mensajes exactos", async () => {
    const f = fakes();
    const d = deps(f);
    await expect(guardarPost(d, validInput({ titulo: "a".repeat(301) }))).rejects.toMatchObject({
      message: "El título es demasiado largo (máx. 300 caracteres)",
      status: 400,
    });
    await expect(guardarPost(d, validInput({ slug: "a".repeat(101) }))).rejects.toMatchObject({
      message: "El slug es demasiado largo (máx. 100 caracteres)",
      status: 400,
    });
    await expect(guardarPost(d, validInput({ md: "a".repeat(200001) }))).rejects.toMatchObject({
      message: "El artículo es demasiado largo (máx. 200000 caracteres)",
      status: 400,
    });
  });
});

describe("guardarPost (editar)", () => {
  it("mismo slug: excluye su html e imagen previos y reescribe", async () => {
    const f = fakes();
    const d = deps(f);
    const r1 = await guardarPost(d, validInput({ titulo: "Titulo Original", slug: "articulo-uno", imagenAssetId: "cover" }));
    const r2 = await guardarPost(
      d,
      validInput({ postId: r1.postId, titulo: "Titulo Editado", slug: "articulo-uno", imagenAssetId: "cover-jpg" })
    );
    expect(r2.postId).toBe(r1.postId);
    const pref2 = snapshotPrefix(PROJECT_ID, r2.snapshotId);
    expect(await f.storage.get(pref2 + "blog/img/articulo-uno.png")).toBeNull();
    expect((await f.storage.get(pref2 + "blog/img/articulo-uno.jpg"))!.body.toString()).toBe("JPEGBYTES");
    const html = (await f.storage.get(pref2 + "blog/articulo-uno.html"))!.body.toString();
    expect(html).toContain("Titulo Editado");
  });

  it("slug nuevo: excluye los archivos del slug viejo y el sitemap pierde la loc vieja", async () => {
    const f = fakes();
    const d = deps(f);
    const r1 = await guardarPost(d, validInput({ slug: "articulo-uno" }));
    const r2 = await guardarPost(d, validInput({ postId: r1.postId, slug: "articulo-dos" }));
    const pref2 = snapshotPrefix(PROJECT_ID, r2.snapshotId);
    expect(await f.storage.get(pref2 + "blog/articulo-uno.html")).toBeNull();
    expect(await f.storage.get(pref2 + "blog/img/articulo-uno.png")).toBeNull();
    expect(await f.storage.get(pref2 + "blog/articulo-dos.html")).not.toBeNull();
    const sitemap = (await f.storage.get(pref2 + "sitemap.xml"))!.body.toString();
    expect(sitemap).not.toContain("articulo-uno.html");
    expect(sitemap).toContain("articulo-dos.html");
  });

  it("la fecha NO cambia al editar", async () => {
    const f = fakes();
    const d = deps(f);
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-01-01T00:00:00.000Z"));
    const r1 = await guardarPost(d, validInput({ slug: "articulo-fecha" }));
    vi.setSystemTime(new Date("2024-06-15T00:00:00.000Z"));
    await guardarPost(d, validInput({ postId: r1.postId, slug: "articulo-fecha", titulo: "Nuevo Titulo" }));
    vi.useRealTimers();
    const post = await f.blog.getPost(ORG, PROJECT_ID, r1.postId);
    expect(post!.fecha).toBe("2024-01-01");
  });

  it("postId inexistente → 404 «Artículo no encontrado»", async () => {
    const f = fakes();
    await expect(guardarPost(deps(f), validInput({ postId: "no-existe" }))).rejects.toMatchObject({
      message: "Artículo no encontrado",
      status: 404,
    });
  });
});

describe("borrarPost", () => {
  it("excluye sus archivos, regenera índice sin él y sitemap sin su loc; borra la fila", async () => {
    const f = fakes();
    const d = deps(f);
    const r1 = await guardarPost(d, validInput({ slug: "articulo-uno", titulo: "Articulo Uno" }));
    await guardarPost(d, validInput({ slug: "articulo-dos", titulo: "Articulo Dos", imagenAssetId: "cover-jpg" }));

    const r3 = await borrarPost(d, { orgId: ORG, projectId: PROJECT_ID, postId: r1.postId });
    const pref3 = snapshotPrefix(PROJECT_ID, r3.snapshotId);
    expect(await f.storage.get(pref3 + "blog/articulo-uno.html")).toBeNull();
    expect(await f.storage.get(pref3 + "blog/img/articulo-uno.png")).toBeNull();
    const indice = (await f.storage.get(pref3 + "blog/index.html"))!.body.toString();
    expect(indice).not.toContain("Articulo Uno");
    expect(indice).toContain("Articulo Dos");
    const sitemap = (await f.storage.get(pref3 + "sitemap.xml"))!.body.toString();
    expect(sitemap).not.toContain("articulo-uno.html");
    expect(sitemap).toContain("articulo-dos.html");
    expect(await f.blog.getPost(ORG, PROJECT_ID, r1.postId)).toBeNull();
  });
});

describe("guardarPlantillas", () => {
  it("con 0 posts: guarda en BD y snapshotId null (sin snapshot)", async () => {
    const f = fakes({ tienePlantilla: false });
    const r = await guardarPlantillas(deps(f), { orgId: ORG, projectId: PROJECT_ID, tplPost: TPL_POST, tplIndex: TPL_INDEX });
    expect(r.snapshotId).toBeNull();
    expect(f.createSnapshotCalls.length).toBe(0);
    const tpl = await f.blog.getBlogTemplate(ORG, PROJECT_ID);
    expect(tpl).toEqual({ tplPost: TPL_POST, tplIndex: TPL_INDEX });
  });

  it("con posts: re-renderiza todos los html con la plantilla nueva (excluye los viejos), imágenes intactas", async () => {
    const f = fakes();
    const d = deps(f);
    await guardarPost(d, validInput({ slug: "articulo-uno", imagenAssetId: "cover" }));

    const r = await guardarPlantillas(d, { orgId: ORG, projectId: PROJECT_ID, tplPost: TPL_POST_V2, tplIndex: TPL_INDEX });
    expect(r.snapshotId).not.toBeNull();
    const pref = snapshotPrefix(PROJECT_ID, r.snapshotId!);
    const html = (await f.storage.get(pref + "blog/articulo-uno.html"))!.body.toString();
    expect(html).toContain("NUEVA-PLANTILLA");
    const img = (await f.storage.get(pref + "blog/img/articulo-uno.png"))!.body.toString();
    expect(img).toBe("PNGBYTES");
  });

  it("plantilla inválida → 400 con mensajes de validarPlantillas", async () => {
    const f = fakes();
    const tplPostInvalido = "<html>{{titulo}}</html>";
    const tplIndexInvalido = "sin marcadores";
    const esperado = validarPlantillas(tplPostInvalido, tplIndexInvalido).join(" · ");
    await expect(
      guardarPlantillas(deps(f), { orgId: ORG, projectId: PROJECT_ID, tplPost: tplPostInvalido, tplIndex: tplIndexInvalido })
    ).rejects.toMatchObject({ message: esperado, status: 400 });
  });
});

describe("previewBlog", () => {
  it("post con override y sin plantilla guardada funciona; imagen = imagenUrl o placeholder", async () => {
    const f = fakes({ tienePlantilla: false });
    const r1 = await previewBlog(deps(f), {
      orgId: ORG,
      projectId: PROJECT_ID,
      tplPost: TPL_POST,
      imagenUrl: "https://x.test/foto.png",
    });
    expect(r1.html).toContain("https://x.test/foto.png");
    const r2 = await previewBlog(deps(f), { orgId: ORG, projectId: PROJECT_ID, tplPost: TPL_POST });
    expect(r2.html).toContain(IMAGEN_EJEMPLO);
  });

  it("index con un ítem de ejemplo", async () => {
    const f = fakes({ tienePlantilla: false });
    const r = await previewBlog(deps(f), { orgId: ORG, projectId: PROJECT_ID, cual: "index", tplIndex: TPL_INDEX });
    expect(r.html).toContain(DATOS_EJEMPLO.titulo);
    expect(r.html).toContain(IMAGEN_EJEMPLO);
  });

  it("reescribe la ruta absoluta del CSS enlazado para que el iframe la resuelva", async () => {
    // La plantilla enlaza /styles.css; el preview debe reescribirla a la ruta de
    // preview e inyectar <base> (mismo mecanismo que el preview normal del sitio),
    // porque el iframe del editor no resuelve /styles.css contra el snapshot.
    const f = fakes({ tienePlantilla: false });
    const tplConCss =
      '<html><head><link rel="stylesheet" href="/styles.css"><title>{{titulo}}</title>{{json_ld}}' +
      '<meta name="description" content="{{meta_descripcion}}"><link rel="canonical" href="{{canonical}}">' +
      '</head><body><img src="{{imagen}}"><p>{{fecha}}</p><article>{{contenido}}</article></body></html>';
    const r = await previewBlog(deps(f), { orgId: ORG, projectId: PROJECT_ID, tplPost: tplConCss });
    expect(r.html).toContain(`href="/api/projects/${PROJECT_ID}/preview/styles.css"`);
    expect(r.html).toContain(`<base href="/api/projects/${PROJECT_ID}/preview/">`);
    // La plantilla GUARDADA (no el preview) conserva la ruta absoluta original:
    // el preview no debe dejar la ruta cruda /styles.css sin reescribir.
    expect(r.html).not.toContain('href="/styles.css"');
  });

  it("NO reescribe la URL de la imagen de portada (ya es una ruta de asset servible)", async () => {
    // La imagen viene como /api/projects/<id>/assets/<id>.<ext> (ya absoluta y
    // exenta del candado). La reescritura del preview NO debe tocarla: si se rehace
    // la vista previa muestra la imagen rota. Regresión del fix del CSS.
    const f = fakes({ tienePlantilla: false });
    const imagenUrl = `/api/projects/${PROJECT_ID}/assets/abc123.png`;
    const tplConCss =
      '<html><head><link rel="stylesheet" href="/styles.css"><title>{{titulo}}</title>{{json_ld}}' +
      '<meta name="description" content="{{meta_descripcion}}"><link rel="canonical" href="{{canonical}}">' +
      '</head><body><img src="{{imagen}}"><p>{{fecha}}</p><article>{{contenido}}</article></body></html>';
    const r = await previewBlog(deps(f), { orgId: ORG, projectId: PROJECT_ID, tplPost: tplConCss, imagenUrl });
    // La imagen queda con su ruta intacta, no "/preview/api/projects/...".
    expect(r.html).toContain(`src="${imagenUrl}"`);
    expect(r.html).not.toContain(`/preview/api/projects/`);
    // Y el CSS sí sigue reescrito.
    expect(r.html).toContain(`href="/api/projects/${PROJECT_ID}/preview/styles.css"`);
  });

  it("sin plantilla guardada ni override → 400 MSG_SIN_PLANTILLA", async () => {
    const f = fakes({ tienePlantilla: false });
    await expect(previewBlog(deps(f), { orgId: ORG, projectId: PROJECT_ID })).rejects.toMatchObject({
      message: MSG_SIN_PLANTILLA,
      status: 400,
    });
    await expect(previewBlog(deps(f), { orgId: ORG, projectId: PROJECT_ID, cual: "index" })).rejects.toMatchObject({
      message: MSG_SIN_PLANTILLA,
      status: 400,
    });
  });
});

describe("estadoBlog", () => {
  it("refleja tienePlantilla y la lista de posts (id/titulo/slug/fecha)", async () => {
    const f = fakes();
    const d = deps(f);
    const r1 = await guardarPost(d, validInput({ slug: "articulo-uno", titulo: "Articulo Uno" }));
    const estado = await estadoBlog(d, { orgId: ORG, projectId: PROJECT_ID });
    expect(estado.tienePlantilla).toBe(true);
    expect(estado.posts).toEqual([{ id: r1.postId, titulo: "Articulo Uno", slug: "articulo-uno", fecha: expect.any(String) }]);
  });
});
