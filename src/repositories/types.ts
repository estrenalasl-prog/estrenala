export type ProjectRow = {
  id: string;
  orgId: string;
  nombre: string;
  entryPath: string;
  currentSnapshotId: string | null;
  subdominio: string | null;
  dominio: string | null;
  publishedSnapshotId: string | null;
  noIndexar: boolean;
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

export type AssetRow = {
  id: string;
  projectId: string;
  storageKey: string;
  contentType: string;
  bytes: number;
  createdAt: string;
};

export type CreateAssetInput = {
  assetId: string;
  projectId: string;
  storageKey: string;
  contentType: string;
  bytes: number;
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
  createAsset(input: CreateAssetInput): Promise<void>;
  getAsset(orgId: string, projectId: string, assetId: string): Promise<AssetRow | null>;
  /**
   * Todo lo que hace falta para servir la web en una sola consulta: `plan` (JOIN
   * con la organización) decide la marca, `noIndexar` la cabecera para Google y
   * `dominio` el canónico cuando además se entra por el subdominio.
   */
  getPublishedSiteByHost(
    q: { subdominio: string } | { dominio: string }
  ): Promise<{
    entryPath: string; storagePrefix: string; plan: string; noIndexar: boolean;
    dominio: string | null; subdominio: string | null;
  } | null>;
  setPublished(orgId: string, projectId: string, snapshotId: string | null): Promise<void>;
  setNoIndexar(orgId: string, projectId: string, noIndexar: boolean): Promise<void>;
  subdominioLibre(subdominio: string): Promise<boolean>;
  /** false si el subdominio ya está en uso (violación de unicidad en carrera). */
  setSubdominio(orgId: string, projectId: string, subdominio: string): Promise<boolean>;
  dominioLibre(dominio: string): Promise<boolean>;
  /** false si el dominio ya está en uso (violación de unicidad en carrera). null desconecta. */
  setDominio(orgId: string, projectId: string, dominio: string | null): Promise<boolean>;
}
