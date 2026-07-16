import { EditorError } from "@/src/editor/errors";
import { renderPost, basePublica } from "@/src/blog/render";
import { validarPrePublicacion } from "@/src/blog/validate";
import { MSG_SIN_PLANTILLA } from "@/src/blog/site-template";
import { guardarPost, sitesBaseDomain, EXT_POR_CONTENT_TYPE } from "@/src/blog/apply";
import { publishSite } from "@/src/publish/publish-site";
import type { DeployTarget } from "@/src/publish/deploy-target";
import type { StorageAdapter } from "@/src/storage/types";
import type { ProjectStore } from "@/src/repositories/types";
import type { BlogStore } from "@/src/repositories/blog";

export type DepsProgramar = { store: ProjectStore; blog: BlogStore; storage: StorageAdapter };
export type DepsRunner = DepsProgramar & { deploy: DeployTarget };

const MAX_POR_TICK = 10;

function hoy(): string { return new Date().toISOString().slice(0, 10); }

// Programa un artículo: valida AHORA todo lo que validaría publicar (plantilla,
// imagen, slug, huecos), para que el usuario se entere de los problemas al
// programar y no cuando ya no está delante. Sin efectos fuera de scheduled_posts:
// la validación renderiza con una base de ejemplo si el proyecto no tiene aún.
export async function programarPost(deps: DepsProgramar, input: {
  orgId: string; projectId: string;
  titulo: string; slug: string; metaDescripcion: string; md: string; imagenAssetId: string;
  publicarEn: string;
}): Promise<{ programadoId: string }> {
  if (input.titulo.length > 300) throw new EditorError("El título es demasiado largo (máx. 300 caracteres)", 400);
  if (input.slug.length > 100) throw new EditorError("El slug es demasiado largo (máx. 100 caracteres)", 400);
  if (input.md.length > 200000) throw new EditorError("El artículo es demasiado largo (máx. 200000 caracteres)", 400);
  const project = await deps.store.getProject(input.orgId, input.projectId);
  if (!project) throw new EditorError("Proyecto no encontrado", 404);
  const tpl = await deps.blog.getBlogTemplate(input.orgId, input.projectId);
  if (!tpl) throw new EditorError(MSG_SIN_PLANTILLA, 400);

  const cuando = Date.parse(input.publicarEn);
  if (!input.publicarEn.trim() || Number.isNaN(cuando)) throw new EditorError("Elige fecha y hora para programar", 400);
  if (cuando <= Date.now()) throw new EditorError("La fecha de publicación debe ser futura", 400);

  // Imagen: mismo resolutor que guardarPost (asset del proyecto con archivo presente).
  let imagen: { ext: string } | null = null;
  if (input.imagenAssetId) {
    const row = await deps.store.getAsset(input.orgId, input.projectId, input.imagenAssetId);
    const ext = row ? EXT_POR_CONTENT_TYPE[row.contentType] : undefined;
    const file = row && ext ? await deps.storage.get(row.storageKey) : null;
    if (row && ext && file) imagen = { ext };
  }

  // El slug debe estar libre frente a los posts existentes Y frente a otras
  // programaciones aún por publicar (si no, la segunda fallaría de madrugada).
  const posts = await deps.blog.listPosts(input.orgId, input.projectId);
  const porPublicar = (await deps.blog.listProgramados(input.orgId, input.projectId))
    .filter((p) => p.estado === "pendiente" || p.estado === "publicando");
  const slugsExistentes = [...posts.map((p) => p.slug), ...porPublicar.map((p) => p.slug)];

  const base = basePublica(project, sitesBaseDomain()) ?? "https://ejemplo.local";
  const ext = imagen?.ext ?? "png";
  const html = renderPost(tpl.tplPost, {
    titulo: input.titulo, slug: input.slug, metaDescripcion: input.metaDescripcion,
    md: input.md, imagenExt: ext,
  }, hoy(), base);
  const errores = validarPrePublicacion({
    titulo: input.titulo, slug: input.slug, slugsExistentes,
    metaDescripcion: input.metaDescripcion,
    imagenPath: imagen ? `/blog/img/${input.slug}.${ext}` : null,
    htmlFinal: html,
  });
  if (errores.length) throw new EditorError(errores.join(" · "), 400);

  return deps.blog.crearProgramado(input.orgId, input.projectId, {
    titulo: input.titulo, slug: input.slug, metaDescripcion: input.metaDescripcion,
    md: input.md, imagenAssetId: input.imagenAssetId,
    publicarEn: new Date(cuando).toISOString(),
  });
}

// Publica las programaciones vencidas: reclama (pendiente→publicando, así dos
// ticks solapados no publican dos veces), materializa el post en un snapshot y
// publica el sitio. Un fallo marca SU fila como error (el contenido no se
// pierde: queda en la fila, visible en la UI) y sigue con las demás.
export async function publicarVencidos(deps: DepsRunner): Promise<{ publicados: number; errores: number }> {
  const filas = await deps.blog.reclamarProgramadosVencidos(MAX_POR_TICK);
  let publicados = 0;
  let errores = 0;
  for (const fila of filas) {
    try {
      const { postId } = await guardarPost({ store: deps.store, blog: deps.blog, storage: deps.storage }, {
        orgId: fila.orgId, projectId: fila.projectId,
        titulo: fila.titulo, slug: fila.slug, metaDescripcion: fila.metaDescripcion,
        md: fila.md, imagenAssetId: fila.imagenAssetId,
      });
      await publishSite({ store: deps.store, deploy: deps.deploy }, { orgId: fila.orgId, projectId: fila.projectId });
      await deps.blog.resolverProgramado(fila.id, { estado: "publicado", postId });
      publicados += 1;
    } catch (e) {
      await deps.blog.resolverProgramado(fila.id, { estado: "error", errorMsg: e instanceof Error ? e.message : String(e) });
      errores += 1;
    }
  }
  return { publicados, errores };
}
