import { and, desc, eq } from "drizzle-orm";
import { db } from "@/src/db/client";
import {
  assets, organizations, projects, snapshots, posts, scheduledPosts, trendsCache,
  blogKeywords, articleDrafts, blogSettings, blogTemplates,
} from "@/src/db/schema";
import type {
  AssetRow, CreateAssetInput, CreateProjectInput, CreateSnapshotInput,
  ProjectRow, ProjectStore, SnapshotInfo, SnapshotRow,
} from "./types";

function toProjectRow(r: typeof projects.$inferSelect): ProjectRow {
  return {
    id: r.id,
    orgId: r.orgId,
    nombre: r.nombre,
    entryPath: r.entryPath,
    currentSnapshotId: r.currentSnapshotId,
    subdominio: r.subdominio,
    dominio: r.dominio,
    publishedSnapshotId: r.publishedSnapshotId,
    noIndexar: r.noIndexar,
    createdAt: r.createdAt.toISOString(),
  };
}

export class DrizzleProjectStore implements ProjectStore {
  async createProjectWithSnapshot(input: CreateProjectInput): Promise<{ projectId: string }> {
    await db.transaction(async (tx) => {
      await tx.insert(projects).values({
        id: input.projectId,
        orgId: input.orgId,
        nombre: input.nombre,
        entryPath: input.entryPath,
        currentSnapshotId: input.snapshotId,
      });
      await tx.insert(snapshots).values({
        id: input.snapshotId,
        projectId: input.projectId,
        tipo: "import",
        storagePrefix: input.storagePrefix,
      });
    });
    return { projectId: input.projectId };
  }

  async getProject(orgId: string, projectId: string): Promise<ProjectRow | null> {
    const r = await db.select().from(projects)
      .where(and(eq(projects.id, projectId), eq(projects.orgId, orgId))).limit(1);
    return r[0] ? toProjectRow(r[0]) : null;
  }

  // Fuera del interfaz ProjectStore a propósito (como getProjectById): borrado en
  // cascada del proyecto. El esquema no tiene ON DELETE CASCADE, así que se borran
  // los hijos en orden dentro de una transacción. El proyecto se filtra por org
  // (quien llama ya validó la pertenencia con getProject).
  async deleteProjectCascade(orgId: string, projectId: string): Promise<void> {
    await db.transaction(async (tx) => {
      await tx.delete(posts).where(eq(posts.projectId, projectId));
      await tx.delete(scheduledPosts).where(eq(scheduledPosts.projectId, projectId));
      await tx.delete(trendsCache).where(eq(trendsCache.projectId, projectId));
      await tx.delete(blogKeywords).where(eq(blogKeywords.projectId, projectId));
      await tx.delete(articleDrafts).where(eq(articleDrafts.projectId, projectId));
      await tx.delete(blogSettings).where(eq(blogSettings.projectId, projectId));
      await tx.delete(blogTemplates).where(eq(blogTemplates.projectId, projectId));
      await tx.delete(assets).where(eq(assets.projectId, projectId));
      await tx.delete(snapshots).where(eq(snapshots.projectId, projectId));
      await tx.delete(projects).where(and(eq(projects.id, projectId), eq(projects.orgId, orgId)));
    });
  }

  // Fuera del interfaz ProjectStore a propósito: SIN filtrar por org, solo para
  // el preview/assets públicos del iframe (la capacidad es el UUID). El resto
  // del código usa getProject (scoped). Lo llaman las rutas con el singleton.
  async getProjectById(projectId: string): Promise<ProjectRow | null> {
    const r = await db.select().from(projects).where(eq(projects.id, projectId)).limit(1);
    return r[0] ? toProjectRow(r[0]) : null;
  }

  async listProjects(orgId: string): Promise<ProjectRow[]> {
    const rows = await db.select().from(projects)
      .where(eq(projects.orgId, orgId)).orderBy(desc(projects.createdAt));
    return rows.map(toProjectRow);
  }

  async setEntryPath(orgId: string, projectId: string, entryPath: string): Promise<void> {
    await db.update(projects).set({ entryPath })
      .where(and(eq(projects.id, projectId), eq(projects.orgId, orgId)));
  }

  async getCurrentSnapshot(orgId: string, projectId: string): Promise<SnapshotRow | null> {
    const p = await db.select().from(projects)
      .where(and(eq(projects.id, projectId), eq(projects.orgId, orgId))).limit(1);
    const snapId = p[0]?.currentSnapshotId;
    if (!snapId) return null;
    const s = await db.select().from(snapshots).where(eq(snapshots.id, snapId)).limit(1);
    if (!s[0]) return null;
    return { id: s[0].id, projectId: s[0].projectId, storagePrefix: s[0].storagePrefix, tipo: s[0].tipo };
  }

  async createSnapshot(input: CreateSnapshotInput): Promise<void> {
    await db.insert(snapshots).values({
      id: input.snapshotId,
      projectId: input.projectId,
      parentId: input.parentId,
      tipo: input.tipo,
      storagePrefix: input.storagePrefix,
      operacionesJson: input.operacionesJson,
    });
  }

  async setCurrentSnapshot(orgId: string, projectId: string, snapshotId: string): Promise<void> {
    await db.update(projects).set({ currentSnapshotId: snapshotId })
      .where(and(eq(projects.id, projectId), eq(projects.orgId, orgId)));
  }

  async listSnapshots(orgId: string, projectId: string): Promise<SnapshotInfo[]> {
    const proj = await db.select().from(projects)
      .where(and(eq(projects.id, projectId), eq(projects.orgId, orgId))).limit(1);
    if (!proj[0]) return [];
    const rows = await db.select().from(snapshots)
      .where(eq(snapshots.projectId, projectId)).orderBy(desc(snapshots.createdAt));
    return rows.map((r) => ({
      id: r.id,
      tipo: r.tipo,
      parentId: r.parentId,
      createdAt: r.createdAt.toISOString(),
      esActual: r.id === proj[0].currentSnapshotId,
    }));
  }

  async getSnapshotById(orgId: string, projectId: string, snapshotId: string): Promise<SnapshotRow | null> {
    const proj = await db.select().from(projects)
      .where(and(eq(projects.id, projectId), eq(projects.orgId, orgId))).limit(1);
    if (!proj[0]) return null;
    const s = await db.select().from(snapshots)
      .where(and(eq(snapshots.id, snapshotId), eq(snapshots.projectId, projectId))).limit(1);
    if (!s[0]) return null;
    return { id: s[0].id, projectId: s[0].projectId, storagePrefix: s[0].storagePrefix, tipo: s[0].tipo };
  }

  async createAsset(input: CreateAssetInput): Promise<void> {
    await db.insert(assets).values({
      id: input.assetId,
      projectId: input.projectId,
      storageKey: input.storageKey,
      contentType: input.contentType,
      bytes: input.bytes,
    });
  }

  async getAsset(orgId: string, projectId: string, assetId: string): Promise<AssetRow | null> {
    const proj = await db.select().from(projects)
      .where(and(eq(projects.id, projectId), eq(projects.orgId, orgId))).limit(1);
    if (!proj[0]) return null;
    const r = await db.select().from(assets)
      .where(and(eq(assets.id, assetId), eq(assets.projectId, projectId))).limit(1);
    if (!r[0]) return null;
    return {
      id: r[0].id,
      projectId: r[0].projectId,
      storageKey: r[0].storageKey,
      contentType: r[0].contentType,
      bytes: r[0].bytes,
      createdAt: r[0].createdAt.toISOString(),
    };
  }

  async getPublishedSiteByHost(
    q: { subdominio: string } | { dominio: string }
  ): Promise<{ entryPath: string; storagePrefix: string; plan: string; noIndexar: boolean; dominio: string | null } | null> {
    const cond = "subdominio" in q
      ? eq(projects.subdominio, q.subdominio)
      : eq(projects.dominio, q.dominio);
    const r = await db
      .select({
        entryPath: projects.entryPath,
        storagePrefix: snapshots.storagePrefix,
        plan: organizations.plan, // decide si la web lleva la marca «Hecho con Estrénala»
        noIndexar: projects.noIndexar, // decide la cabecera X-Robots-Tag
        dominio: projects.dominio, // decide el canónico cuando se entra por el subdominio
      })
      .from(projects)
      .innerJoin(snapshots, eq(projects.publishedSnapshotId, snapshots.id))
      .innerJoin(organizations, eq(projects.orgId, organizations.id))
      .where(cond)
      .limit(1);
    return r[0] ?? null;
  }

  async setPublished(orgId: string, projectId: string, snapshotId: string | null): Promise<void> {
    await db.update(projects).set({ publishedSnapshotId: snapshotId })
      .where(and(eq(projects.id, projectId), eq(projects.orgId, orgId)));
  }

  async setNoIndexar(orgId: string, projectId: string, noIndexar: boolean): Promise<void> {
    await db.update(projects).set({ noIndexar })
      .where(and(eq(projects.id, projectId), eq(projects.orgId, orgId)));
  }

  async subdominioLibre(subdominio: string): Promise<boolean> {
    const r = await db.select({ id: projects.id }).from(projects)
      .where(eq(projects.subdominio, subdominio)).limit(1);
    return !r[0];
  }

  async setSubdominio(orgId: string, projectId: string, subdominio: string): Promise<boolean> {
    try {
      await db.update(projects).set({ subdominio })
        .where(and(eq(projects.id, projectId), eq(projects.orgId, orgId)));
      return true;
    } catch (e) {
      const code = (e as { code?: string; cause?: { code?: string } })?.code
        ?? (e as { cause?: { code?: string } })?.cause?.code;
      if (code === "23505") return false; // unique_violation
      throw e;
    }
  }

  async dominioLibre(dominio: string): Promise<boolean> {
    const r = await db.select({ id: projects.id }).from(projects)
      .where(eq(projects.dominio, dominio)).limit(1);
    return !r[0];
  }

  async setDominio(orgId: string, projectId: string, dominio: string | null): Promise<boolean> {
    try {
      await db.update(projects).set({ dominio })
        .where(and(eq(projects.id, projectId), eq(projects.orgId, orgId)));
      return true;
    } catch (e) {
      const code = (e as { code?: string; cause?: { code?: string } })?.code
        ?? (e as { cause?: { code?: string } })?.cause?.code;
      if (code === "23505") return false; // unique_violation
      throw e;
    }
  }
}

export const projectStore = new DrizzleProjectStore();
