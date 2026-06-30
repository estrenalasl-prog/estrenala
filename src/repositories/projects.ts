import { and, desc, eq } from "drizzle-orm";
import { db } from "@/src/db/client";
import { projects, snapshots } from "@/src/db/schema";
import type {
  CreateProjectInput, CreateSnapshotInput, ProjectRow, ProjectStore, SnapshotInfo, SnapshotRow,
} from "./types";

function toProjectRow(r: typeof projects.$inferSelect): ProjectRow {
  return {
    id: r.id,
    orgId: r.orgId,
    nombre: r.nombre,
    entryPath: r.entryPath,
    currentSnapshotId: r.currentSnapshotId,
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
}

export const projectStore = new DrizzleProjectStore();
