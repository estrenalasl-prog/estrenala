import { and, desc, eq } from "drizzle-orm";
import { db } from "@/src/db/client";
import { articleDrafts, blogKeywords, blogSettings, blogTemplates, posts, projects, trendsCache } from "@/src/db/schema";

export type PostRow = {
  id: string;
  projectId: string;
  titulo: string;
  slug: string;
  metaDescripcion: string;
  md: string;
  imagenAssetId: string;
  imagenExt: string;
  fecha: string;
  createdAt: string;
  updatedAt: string;
};

export type PostInput = {
  titulo: string;
  slug: string;
  metaDescripcion: string;
  md: string;
  imagenAssetId: string;
  imagenExt: string;
};

export type DraftRow = {
  id: string;
  projectId: string;
  keyword: string;
  analisisJson: string | null;
  planMd: string | null;
  investigacionMd: string | null;
  articuloMd: string | null;
  linksHechos: number;
  titulo: string | null;
  slug: string | null;
  metaDescripcion: string | null;
  estado: string; // pipeline | revision | error
  errorMsg: string | null;
  createdAt: string;
  updatedAt: string;
};

export type DraftPatch = Partial<Pick<DraftRow,
  "analisisJson" | "planMd" | "investigacionMd" | "articuloMd" | "linksHechos" |
  "titulo" | "slug" | "metaDescripcion" | "estado" | "errorMsg">>;

// El modelo de IA ya no vive aquí: se elige en Configuración (org_settings.modelo_ia, 4d).
// La columna blog_settings.modelo del 4b2 queda sin uso en código.
export type BlogSettings = { nicho: string; idioma: string; keywordsSemilla: string };

export type KeywordRow = {
  id: string;
  projectId: string;
  keyword: string;
  fuente: string; // trends | related
  crecimientoPct: number | null;
  volumenAprox: number | null;
  relevancia: number;
  estado: string; // nueva | usada | descartada
  discoveredAt: string;
};

export type KeywordNueva = Pick<KeywordRow, "keyword" | "fuente" | "crecimientoPct" | "volumenAprox" | "relevancia">;

export interface BlogStore {
  getBlogTemplate(orgId: string, projectId: string): Promise<{ tplPost: string; tplIndex: string } | null>;
  setBlogTemplate(orgId: string, projectId: string, tpl: { tplPost: string; tplIndex: string }): Promise<void>;
  listPosts(orgId: string, projectId: string): Promise<PostRow[]>; // fecha desc, createdAt desc
  getPost(orgId: string, projectId: string, postId: string): Promise<PostRow | null>;
  createPost(orgId: string, projectId: string, input: PostInput & { fecha: string }): Promise<{ postId: string }>;
  updatePost(orgId: string, projectId: string, postId: string, input: PostInput): Promise<void>;
  deletePost(orgId: string, projectId: string, postId: string): Promise<void>;
  getBlogSettings(orgId: string, projectId: string): Promise<BlogSettings | null>;
  setBlogSettings(orgId: string, projectId: string, s: BlogSettings): Promise<void>; // upsert
  createDraft(orgId: string, projectId: string, keyword: string): Promise<{ draftId: string }>;
  getDraft(orgId: string, projectId: string, draftId: string): Promise<DraftRow | null>;
  listDrafts(orgId: string, projectId: string): Promise<DraftRow[]>; // createdAt desc
  updateDraft(orgId: string, projectId: string, draftId: string, patch: DraftPatch): Promise<void>;
  deleteDraft(orgId: string, projectId: string, draftId: string): Promise<void>;
  listKeywords(orgId: string, projectId: string): Promise<KeywordRow[]>; // relevancia desc, discoveredAt desc
  insertKeywords(orgId: string, projectId: string, items: KeywordNueva[]): Promise<void>; // ignora duplicados (project, keyword)
  setKeywordEstado(orgId: string, projectId: string, keywordId: string, estado: string): Promise<boolean>; // false si no existe
  hayTrendsCache(orgId: string, projectId: string, fecha: string): Promise<boolean>;
  marcarTrendsCache(orgId: string, projectId: string, fecha: string, payload: string): Promise<void>;
}

async function proyectoDeOrg(orgId: string, projectId: string): Promise<boolean> {
  const r = await db.select({ id: projects.id }).from(projects)
    .where(and(eq(projects.id, projectId), eq(projects.orgId, orgId))).limit(1);
  return r.length > 0;
}

function toDraftRow(r: typeof articleDrafts.$inferSelect): DraftRow {
  return {
    id: r.id,
    projectId: r.projectId,
    keyword: r.keyword,
    analisisJson: r.analisisJson,
    planMd: r.planMd,
    investigacionMd: r.investigacionMd,
    articuloMd: r.articuloMd,
    linksHechos: r.linksHechos,
    titulo: r.titulo,
    slug: r.slug,
    metaDescripcion: r.metaDescripcion,
    estado: r.estado,
    errorMsg: r.errorMsg,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  };
}

function toPostRow(r: typeof posts.$inferSelect): PostRow {
  return {
    id: r.id,
    projectId: r.projectId,
    titulo: r.titulo,
    slug: r.slug,
    metaDescripcion: r.metaDescripcion,
    md: r.md,
    imagenAssetId: r.imagenAssetId,
    imagenExt: r.imagenExt,
    fecha: r.fecha,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  };
}

export class DrizzleBlogStore implements BlogStore {
  async getBlogTemplate(orgId: string, projectId: string): Promise<{ tplPost: string; tplIndex: string } | null> {
    if (!(await proyectoDeOrg(orgId, projectId))) return null;
    const r = await db.select().from(blogTemplates)
      .where(eq(blogTemplates.projectId, projectId)).limit(1);
    if (!r[0]) return null;
    return { tplPost: r[0].tplPost, tplIndex: r[0].tplIndex };
  }

  async setBlogTemplate(orgId: string, projectId: string, tpl: { tplPost: string; tplIndex: string }): Promise<void> {
    if (!(await proyectoDeOrg(orgId, projectId))) return;
    await db.insert(blogTemplates)
      .values({ projectId, tplPost: tpl.tplPost, tplIndex: tpl.tplIndex })
      .onConflictDoUpdate({
        target: blogTemplates.projectId,
        set: { tplPost: tpl.tplPost, tplIndex: tpl.tplIndex, updatedAt: new Date() },
      });
  }

  async listPosts(orgId: string, projectId: string): Promise<PostRow[]> {
    if (!(await proyectoDeOrg(orgId, projectId))) return [];
    const rows = await db.select().from(posts)
      .where(eq(posts.projectId, projectId))
      .orderBy(desc(posts.fecha), desc(posts.createdAt));
    return rows.map(toPostRow);
  }

  async getPost(orgId: string, projectId: string, postId: string): Promise<PostRow | null> {
    if (!(await proyectoDeOrg(orgId, projectId))) return null;
    const r = await db.select().from(posts)
      .where(and(eq(posts.id, postId), eq(posts.projectId, projectId))).limit(1);
    return r[0] ? toPostRow(r[0]) : null;
  }

  async createPost(orgId: string, projectId: string, input: PostInput & { fecha: string }): Promise<{ postId: string }> {
    if (!(await proyectoDeOrg(orgId, projectId))) throw new Error("Proyecto no encontrado en la organización");
    const r = await db.insert(posts).values({
      projectId,
      titulo: input.titulo,
      slug: input.slug,
      metaDescripcion: input.metaDescripcion,
      md: input.md,
      imagenAssetId: input.imagenAssetId,
      imagenExt: input.imagenExt,
      fecha: input.fecha,
    }).returning({ id: posts.id });
    return { postId: r[0].id };
  }

  async updatePost(orgId: string, projectId: string, postId: string, input: PostInput): Promise<void> {
    if (!(await proyectoDeOrg(orgId, projectId))) return;
    await db.update(posts).set({
      titulo: input.titulo,
      slug: input.slug,
      metaDescripcion: input.metaDescripcion,
      md: input.md,
      imagenAssetId: input.imagenAssetId,
      imagenExt: input.imagenExt,
      updatedAt: new Date(),
    }).where(and(eq(posts.id, postId), eq(posts.projectId, projectId)));
  }

  async deletePost(orgId: string, projectId: string, postId: string): Promise<void> {
    if (!(await proyectoDeOrg(orgId, projectId))) return;
    await db.delete(posts).where(and(eq(posts.id, postId), eq(posts.projectId, projectId)));
  }

  async getBlogSettings(orgId: string, projectId: string): Promise<BlogSettings | null> {
    if (!(await proyectoDeOrg(orgId, projectId))) return null;
    const r = await db.select().from(blogSettings)
      .where(eq(blogSettings.projectId, projectId)).limit(1);
    if (!r[0]) return null;
    return { nicho: r[0].nicho, idioma: r[0].idioma, keywordsSemilla: r[0].keywordsSemilla };
  }

  async setBlogSettings(orgId: string, projectId: string, s: BlogSettings): Promise<void> {
    if (!(await proyectoDeOrg(orgId, projectId))) return;
    await db.insert(blogSettings)
      .values({ projectId, nicho: s.nicho, idioma: s.idioma, keywordsSemilla: s.keywordsSemilla })
      .onConflictDoUpdate({
        target: blogSettings.projectId,
        set: { nicho: s.nicho, idioma: s.idioma, keywordsSemilla: s.keywordsSemilla, updatedAt: new Date() },
      });
  }

  async createDraft(orgId: string, projectId: string, keyword: string): Promise<{ draftId: string }> {
    if (!(await proyectoDeOrg(orgId, projectId))) throw new Error("Proyecto no encontrado en la organización");
    const r = await db.insert(articleDrafts).values({ projectId, keyword }).returning({ id: articleDrafts.id });
    return { draftId: r[0].id };
  }

  async getDraft(orgId: string, projectId: string, draftId: string): Promise<DraftRow | null> {
    if (!(await proyectoDeOrg(orgId, projectId))) return null;
    const r = await db.select().from(articleDrafts)
      .where(and(eq(articleDrafts.id, draftId), eq(articleDrafts.projectId, projectId))).limit(1);
    return r[0] ? toDraftRow(r[0]) : null;
  }

  async listDrafts(orgId: string, projectId: string): Promise<DraftRow[]> {
    if (!(await proyectoDeOrg(orgId, projectId))) return [];
    const rows = await db.select().from(articleDrafts)
      .where(eq(articleDrafts.projectId, projectId))
      .orderBy(desc(articleDrafts.createdAt));
    return rows.map(toDraftRow);
  }

  async updateDraft(orgId: string, projectId: string, draftId: string, patch: DraftPatch): Promise<void> {
    if (!(await proyectoDeOrg(orgId, projectId))) return;
    await db.update(articleDrafts).set({ ...patch, updatedAt: new Date() })
      .where(and(eq(articleDrafts.id, draftId), eq(articleDrafts.projectId, projectId)));
  }

  async deleteDraft(orgId: string, projectId: string, draftId: string): Promise<void> {
    if (!(await proyectoDeOrg(orgId, projectId))) return;
    await db.delete(articleDrafts).where(and(eq(articleDrafts.id, draftId), eq(articleDrafts.projectId, projectId)));
  }

  async listKeywords(orgId: string, projectId: string): Promise<KeywordRow[]> {
    if (!(await proyectoDeOrg(orgId, projectId))) return [];
    const rows = await db.select().from(blogKeywords)
      .where(eq(blogKeywords.projectId, projectId))
      .orderBy(desc(blogKeywords.relevancia), desc(blogKeywords.discoveredAt));
    return rows.map((r) => ({
      id: r.id,
      projectId: r.projectId,
      keyword: r.keyword,
      fuente: r.fuente,
      crecimientoPct: r.crecimientoPct,
      volumenAprox: r.volumenAprox,
      relevancia: r.relevancia,
      estado: r.estado,
      discoveredAt: r.discoveredAt.toISOString(),
    }));
  }

  async insertKeywords(orgId: string, projectId: string, items: KeywordNueva[]): Promise<void> {
    if (!(await proyectoDeOrg(orgId, projectId)) || items.length === 0) return;
    await db.insert(blogKeywords)
      .values(items.map((i) => ({ projectId, ...i })))
      .onConflictDoNothing();
  }

  async setKeywordEstado(orgId: string, projectId: string, keywordId: string, estado: string): Promise<boolean> {
    if (!(await proyectoDeOrg(orgId, projectId))) return false;
    const r = await db.update(blogKeywords).set({ estado })
      .where(and(eq(blogKeywords.id, keywordId), eq(blogKeywords.projectId, projectId)))
      .returning({ id: blogKeywords.id });
    return r.length > 0;
  }

  async hayTrendsCache(orgId: string, projectId: string, fecha: string): Promise<boolean> {
    if (!(await proyectoDeOrg(orgId, projectId))) return false;
    const r = await db.select({ id: trendsCache.id }).from(trendsCache)
      .where(and(eq(trendsCache.projectId, projectId), eq(trendsCache.fecha, fecha))).limit(1);
    return r.length > 0;
  }

  async marcarTrendsCache(orgId: string, projectId: string, fecha: string, payload: string): Promise<void> {
    if (!(await proyectoDeOrg(orgId, projectId))) return;
    await db.insert(trendsCache).values({ projectId, fecha, payload }).onConflictDoNothing();
  }
}

export const blogStore: BlogStore = new DrizzleBlogStore();
