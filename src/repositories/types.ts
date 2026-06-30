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

export type SnapshotInfo = {
  id: string;
  tipo: string;
  parentId: string | null;
  createdAt: string;
  esActual: boolean;
};

export type CreateSnapshotInput = {
  snapshotId: string;
  projectId: string;
  parentId: string;
  tipo: string;
  storagePrefix: string;
  operacionesJson: unknown;
};

export interface ProjectStore {
  createProjectWithSnapshot(input: CreateProjectInput): Promise<{ projectId: string }>;
  getProject(orgId: string, projectId: string): Promise<ProjectRow | null>;
  listProjects(orgId: string): Promise<ProjectRow[]>;
  setEntryPath(orgId: string, projectId: string, entryPath: string): Promise<void>;
  getCurrentSnapshot(orgId: string, projectId: string): Promise<SnapshotRow | null>;
  createSnapshot(input: CreateSnapshotInput): Promise<void>;
  setCurrentSnapshot(orgId: string, projectId: string, snapshotId: string): Promise<void>;
  listSnapshots(orgId: string, projectId: string): Promise<SnapshotInfo[]>;
  getSnapshotById(orgId: string, projectId: string, snapshotId: string): Promise<SnapshotRow | null>;
}
