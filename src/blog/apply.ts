import { EditorError } from "@/src/editor/errors";
import { crearSnapshotEditado } from "@/src/editor/snapshot-copy";
import { renderPost, itemsIndice, basePublica, DATOS_EJEMPLO, IMAGEN_EJEMPLO } from "./render";
import { renderIndex } from "./blog-index";
import { actualizarSitemap, quitarDelSitemap } from "./sitemap";
import { validarPrePublicacion } from "./validate";
import { validarPlantillas, MSG_SIN_PLANTILLA } from "./site-template";
import { rewriteHtml } from "@/src/preview/rewrite";
import { generarSubdominio } from "@/src/publish/publish-site";
import type { StorageAdapter } from "@/src/storage/types";
import type { ProjectStore, ProjectRow, SnapshotRow } from "@/src/repositories/types";
import type { BlogStore, PostRow } from "@/src/repositories/blog";

type Deps = { store: ProjectStore; blog: BlogStore; storage: StorageAdapter };

const EXT_POR_CONTENT_TYPE: Record<string, string> = {
  "image/png": "png", "image/jpeg": "jpg", "image/gif": "gif",
  "image/webp": "webp", "image/avif": "avif", "image/svg+xml": "svg",
};
const XML = "application/xml";
const HTML = "text/html; charset=utf-8";

function sitesBaseDomain(): string {
  return process.env.SITES_BASE_DOMAIN ?? process.env.PLATFORM_HOST ?? "localhost:3000";
}
function hoy(): string { return new Date().toISOString().slice(0, 10); }

async function contexto(deps: Deps, orgId: string, projectId: string) {
  const project = await deps.store.getProject(orgId, projectId);
  if (!project) throw new EditorError("Proyecto no encontrado", 404);
  const current = await deps.store.getCurrentSnapshot(orgId, projectId);
  if (!current) throw new EditorError("El proyecto no tiene snapshot actual", 400);
  return { project, current };
}

// Base pública para canonicals/sitemap; si el proyecto aún no tiene subdominio
// ni dominio, se le asigna aquí (igual que haría el primer Publicar).
async function baseDelProyecto(deps: Deps, orgId: string, project: ProjectRow): Promise<string> {
  const base = basePublica(project, sitesBaseDomain());
  if (base) return base;
  const sub = await generarSubdominio(deps.store, project.nombre);
  const ok = await deps.store.setSubdominio(orgId, project.id, sub);
  if (!ok) throw new EditorError("Ese subdominio ya está en uso", 409);
  return `https://${sub}.${sitesBaseDomain()}`;
}

async function sitemapPrevio(deps: Deps, current: SnapshotRow): Promise<string | null> {
  const f = await deps.storage.get(current.storagePrefix + "sitemap.xml");
  return f ? f.body.toString("utf-8") : null;
}

function ordenar(posts: { fecha: string; createdAt: string }[]): void {
  posts.sort((a, b) => (b.fecha.localeCompare(a.fecha)) || (b.createdAt.localeCompare(a.createdAt)));
}

export async function estadoBlog(deps: Deps, input: { orgId: string; projectId: string }) {
  const project = await deps.store.getProject(input.orgId, input.projectId);
  if (!project) throw new EditorError("Proyecto no encontrado", 404);
  const tpl = await deps.blog.getBlogTemplate(input.orgId, input.projectId);
  const posts = await deps.blog.listPosts(input.orgId, input.projectId);
  return { tienePlantilla: !!tpl, posts: posts.map((p) => ({ id: p.id, titulo: p.titulo, slug: p.slug, fecha: p.fecha })) };
}

export async function guardarPost(deps: Deps, input: {
  orgId: string; projectId: string; postId?: string | null;
  titulo: string; slug: string; metaDescripcion: string; md: string; imagenAssetId: string;
}): Promise<{ postId: string; snapshotId: string }> {
  if (input.titulo.length > 300) throw new EditorError("El título es demasiado largo (máx. 300 caracteres)", 400);
  if (input.slug.length > 100) throw new EditorError("El slug es demasiado largo (máx. 100 caracteres)", 400);
  if (input.md.length > 200000) throw new EditorError("El artículo es demasiado largo (máx. 200000 caracteres)", 400);
  const { project, current } = await contexto(deps, input.orgId, input.projectId);
  const tpl = await deps.blog.getBlogTemplate(input.orgId, input.projectId);
  if (!tpl) throw new EditorError(MSG_SIN_PLANTILLA, 400);
  const previa = input.postId ? await deps.blog.getPost(input.orgId, input.projectId, input.postId) : null;
  if (input.postId && !previa) throw new EditorError("Artículo no encontrado", 404);

  // Imagen: asset del proyecto con archivo presente; ext derivada del contentType.
  let imagen: { body: Buffer; contentType: string; ext: string } | null = null;
  if (input.imagenAssetId) {
    const row = await deps.store.getAsset(input.orgId, input.projectId, input.imagenAssetId);
    const ext = row ? EXT_POR_CONTENT_TYPE[row.contentType] : undefined;
    const file = row && ext ? await deps.storage.get(row.storageKey) : null;
    if (row && ext && file) imagen = { body: file.body, contentType: row.contentType, ext };
  }

  const todos = await deps.blog.listPosts(input.orgId, input.projectId);
  const slugsExistentes = todos.filter((p) => p.id !== (input.postId ?? "")).map((p) => p.slug);
  const fecha = previa?.fecha ?? hoy();
  const base = await baseDelProyecto(deps, input.orgId, project);
  const ext = imagen?.ext ?? "png";
  const html = renderPost(tpl.tplPost, { titulo: input.titulo, slug: input.slug, metaDescripcion: input.metaDescripcion, md: input.md, imagenExt: ext }, fecha, base);

  const errores = validarPrePublicacion({
    titulo: input.titulo, slug: input.slug, slugsExistentes,
    metaDescripcion: input.metaDescripcion,
    imagenPath: imagen ? `/blog/img/${input.slug}.${ext}` : null,
    htmlFinal: html,
  });
  if (errores.length) throw new EditorError(errores.join(" · "), 400);

  // Índice futuro: la lista de BD manda (sin la versión previa, con la nueva).
  const futuros = todos.filter((p) => p.id !== (input.postId ?? "")).map((p) => ({
    titulo: p.titulo, slug: p.slug, metaDescripcion: p.metaDescripcion, fecha: p.fecha, imagenExt: p.imagenExt, createdAt: p.createdAt,
  }));
  futuros.push({ titulo: input.titulo, slug: input.slug, metaDescripcion: input.metaDescripcion, fecha, imagenExt: ext, createdAt: previa?.createdAt ?? "9999" });
  ordenar(futuros);
  const indice = renderIndex(tpl.tplIndex, itemsIndice(futuros));

  let xml = await sitemapPrevio(deps, current);
  if (previa && previa.slug !== input.slug) xml = quitarDelSitemap(xml ?? "", `${base}/blog/${previa.slug}.html`) || null;
  const sitemap = actualizarSitemap(xml, [
    { loc: `${base}/blog/${input.slug}.html`, lastmod: hoy() },
    { loc: `${base}/blog/index.html`, lastmod: hoy() },
  ]);

  const excluir = new Set(["blog/index.html", "sitemap.xml", `blog/${input.slug}.html`, `blog/img/${input.slug}.${ext}`]);
  if (previa) { excluir.add(`blog/${previa.slug}.html`); excluir.add(`blog/img/${previa.slug}.${previa.imagenExt}`); }
  const extras = new Map<string, { body: Buffer; contentType: string }>([
    [`blog/${input.slug}.html`, { body: Buffer.from(html, "utf-8"), contentType: HTML }],
    [`blog/img/${input.slug}.${ext}`, { body: imagen!.body, contentType: imagen!.contentType }],
    ["blog/index.html", { body: Buffer.from(indice, "utf-8"), contentType: HTML }],
    ["sitemap.xml", { body: Buffer.from(sitemap, "utf-8"), contentType: XML }],
  ]);

  const { snapshotId } = await crearSnapshotEditado(deps, {
    orgId: input.orgId, projectId: input.projectId,
    currentSnapshot: { id: current.id, storagePrefix: current.storagePrefix },
    transformar: () => null, extras, excluir, tipo: "blog",
    operacionesJson: { blog: { accion: previa ? "editar" : "crear", slug: input.slug } },
  });

  const datos = { titulo: input.titulo, slug: input.slug, metaDescripcion: input.metaDescripcion, md: input.md, imagenAssetId: input.imagenAssetId, imagenExt: ext };
  if (previa) { await deps.blog.updatePost(input.orgId, input.projectId, previa.id, datos); return { postId: previa.id, snapshotId }; }
  const { postId } = await deps.blog.createPost(input.orgId, input.projectId, { ...datos, fecha });
  return { postId, snapshotId };
}

export async function borrarPost(deps: Deps, input: { orgId: string; projectId: string; postId: string }): Promise<{ snapshotId: string }> {
  const { project, current } = await contexto(deps, input.orgId, input.projectId);
  const tpl = await deps.blog.getBlogTemplate(input.orgId, input.projectId);
  if (!tpl) throw new EditorError(MSG_SIN_PLANTILLA, 400);
  const previa = await deps.blog.getPost(input.orgId, input.projectId, input.postId);
  if (!previa) throw new EditorError("Artículo no encontrado", 404);
  const base = await baseDelProyecto(deps, input.orgId, project);

  const futuros = (await deps.blog.listPosts(input.orgId, input.projectId)).filter((p) => p.id !== previa.id);
  const indice = renderIndex(tpl.tplIndex, itemsIndice(futuros));
  const xml = quitarDelSitemap((await sitemapPrevio(deps, current)) ?? "", `${base}/blog/${previa.slug}.html`);
  const sitemap = actualizarSitemap(xml || null, [{ loc: `${base}/blog/index.html`, lastmod: hoy() }]);

  const { snapshotId } = await crearSnapshotEditado(deps, {
    orgId: input.orgId, projectId: input.projectId,
    currentSnapshot: { id: current.id, storagePrefix: current.storagePrefix },
    transformar: () => null,
    extras: new Map([
      ["blog/index.html", { body: Buffer.from(indice, "utf-8"), contentType: HTML }],
      ["sitemap.xml", { body: Buffer.from(sitemap, "utf-8"), contentType: XML }],
    ]),
    excluir: new Set(["blog/index.html", "sitemap.xml", `blog/${previa.slug}.html`, `blog/img/${previa.slug}.${previa.imagenExt}`]),
    tipo: "blog",
    operacionesJson: { blog: { accion: "borrar", slug: previa.slug } },
  });
  await deps.blog.deletePost(input.orgId, input.projectId, previa.id);
  return { snapshotId };
}

export async function guardarPlantillas(deps: Deps, input: { orgId: string; projectId: string; tplPost: string; tplIndex: string }): Promise<{ snapshotId: string | null }> {
  const errores = validarPlantillas(input.tplPost, input.tplIndex);
  if (errores.length) throw new EditorError(errores.join(" · "), 400);
  const { project, current } = await contexto(deps, input.orgId, input.projectId);
  const posts = await deps.blog.listPosts(input.orgId, input.projectId);
  if (posts.length === 0) {
    await deps.blog.setBlogTemplate(input.orgId, input.projectId, { tplPost: input.tplPost, tplIndex: input.tplIndex });
    return { snapshotId: null };
  }
  const base = await baseDelProyecto(deps, input.orgId, project);
  const excluir = new Set(["blog/index.html", "sitemap.xml"]);
  const extras = new Map<string, { body: Buffer; contentType: string }>();
  const entradas: { loc: string; lastmod: string }[] = [{ loc: `${base}/blog/index.html`, lastmod: hoy() }];
  for (const p of posts) {
    const html = renderPost(input.tplPost, { titulo: p.titulo, slug: p.slug, metaDescripcion: p.metaDescripcion, md: p.md, imagenExt: p.imagenExt }, p.fecha, base);
    excluir.add(`blog/${p.slug}.html`);
    extras.set(`blog/${p.slug}.html`, { body: Buffer.from(html, "utf-8"), contentType: HTML });
    entradas.push({ loc: `${base}/blog/${p.slug}.html`, lastmod: hoy() });
  }
  const ordenados = posts.map((p) => ({ titulo: p.titulo, slug: p.slug, metaDescripcion: p.metaDescripcion, fecha: p.fecha, imagenExt: p.imagenExt, createdAt: p.createdAt }));
  ordenar(ordenados);
  extras.set("blog/index.html", { body: Buffer.from(renderIndex(input.tplIndex, itemsIndice(ordenados)), "utf-8"), contentType: HTML });
  extras.set("sitemap.xml", { body: Buffer.from(actualizarSitemap(await sitemapPrevio(deps, current), entradas), "utf-8"), contentType: XML });

  const { snapshotId } = await crearSnapshotEditado(deps, {
    orgId: input.orgId, projectId: input.projectId,
    currentSnapshot: { id: current.id, storagePrefix: current.storagePrefix },
    transformar: () => null, extras, excluir, tipo: "blog",
    operacionesJson: { blog: { accion: "plantilla" } },
  });
  await deps.blog.setBlogTemplate(input.orgId, input.projectId, { tplPost: input.tplPost, tplIndex: input.tplIndex });
  return { snapshotId };
}

export async function previewBlog(deps: Deps, input: {
  orgId: string; projectId: string; cual?: "post" | "index";
  tplPost?: string; tplIndex?: string;
  titulo?: string; slug?: string; metaDescripcion?: string; md?: string; imagenUrl?: string;
}): Promise<{ html: string }> {
  const project = await deps.store.getProject(input.orgId, input.projectId);
  if (!project) throw new EditorError("Proyecto no encontrado", 404);
  const guardada = await deps.blog.getBlogTemplate(input.orgId, input.projectId);
  const cual = input.cual ?? "post";
  const base = basePublica(project, sitesBaseDomain()) ?? "https://ejemplo.local";
  // Las plantillas ENLAZAN el CSS del sitio con rutas absolutas (/styles.css). El
  // iframe del editor no las resuelve solo, así que aplicamos la misma reescritura
  // que el preview normal del sitio (root-absolutas → ruta de preview + <base>) para
  // que la vista previa se vea con el diseño real. Solo afecta al preview efímero;
  // los archivos guardados conservan las rutas absolutas (correctas al publicar).
  const baseHref = `/api/projects/${input.projectId}/preview/`;
  if (cual === "index") {
    const tplIndex = input.tplIndex ?? guardada?.tplIndex;
    if (!tplIndex) throw new EditorError(MSG_SIN_PLANTILLA, 400);
    const item = { ...DATOS_EJEMPLO, fecha: hoy() };
    let html: string;
    try {
      html = renderIndex(tplIndex, [{ titulo: item.titulo, slug: item.slug, metaDescripcion: item.metaDescripcion, fecha: item.fecha, imagen: IMAGEN_EJEMPLO }]);
    } catch (e) {
      throw new EditorError(e instanceof Error ? e.message : "Plantilla no válida", 400);
    }
    return { html: rewriteHtml(html, baseHref) };
  }
  const tplPost = input.tplPost ?? guardada?.tplPost;
  if (!tplPost) throw new EditorError(MSG_SIN_PLANTILLA, 400);
  const datos = {
    titulo: input.titulo?.trim() ? input.titulo : DATOS_EJEMPLO.titulo,
    slug: input.slug?.trim() ? input.slug : DATOS_EJEMPLO.slug,
    metaDescripcion: input.metaDescripcion?.trim() ? input.metaDescripcion : DATOS_EJEMPLO.metaDescripcion,
    md: input.md?.trim() ? input.md : DATOS_EJEMPLO.md,
    imagenExt: "png",
  };
  return { html: rewriteHtml(renderPost(tplPost, datos, hoy(), base, input.imagenUrl ?? IMAGEN_EJEMPLO), baseHref) };
}
