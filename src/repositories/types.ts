export type ProjectRow = {
  id: string;
  orgId: string;
  nombre: string;
  entryPath: string;
  currentSnapshotId: string | null;
  createdAt: string;
};

export type SnapshotRow = {
  id: string;
  projectId: string;
  storagePrefix: string;
  tipo: string;
};

export type CreateProjectInput = {
  projectId: string;
  snapshotId: string;
  orgId: string;
  nombre: string;
  entryPath: string;
  storagePrefix: string;
};

export interface ProjectStore {
  createProjectWithSnapshot(input: CreateProjectInput): Promise<{ projectId: string }>;
  getProject(orgId: string, projectId: string): Promise<ProjectRow | null>;
  listProjects(orgId: string): Promise<ProjectRow[]>;
  setEntryPath(orgId: string, projectId: string, entryPath: string): Promise<void>;
  getCurrentSnapshot(orgId: string, projectId: string): Promise<SnapshotRow | null>;
}
