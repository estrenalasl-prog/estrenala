import { slugify, esSlugValido, formatoSlugValido, esReservado } from "./slug";
import { PublishError } from "./errors";
import type { DeployTarget } from "./deploy-target";
import type { ProjectStore } from "@/src/repositories/types";

async function generarSubdominio(store: ProjectStore, nombre: string): Promise<string> {
  const base = slugify(nombre);
  for (let i = 1; i <= 20; i++) {
    const sufijo = i === 1 ? "" : `-${i}`;
    const cand = base.slice(0, 63 - sufijo.length).replace(/-+$/g, "") + sufijo;
    if (esSlugValido(cand) && (await store.subdominioLibre(cand))) return cand;
  }
  throw new PublishError("No hay subdominios libres para ese nombre", 409);
}

export async function publishSite(
  deps: { store: ProjectStore; deploy: DeployTarget },
  input: { orgId: string; projectId: string }
): Promise<{ subdominio: string; publishedSnapshotId: string }> {
  const project = await deps.store.getProject(input.orgId, input.projectId);
  if (!project) throw new PublishError("Proyecto no encontrado", 404);
  const current = await deps.store.getCurrentSnapshot(input.orgId, input.projectId);
  if (!current) throw new PublishError("El proyecto no tiene contenido que publicar", 400);

  let sub = project.subdominio;
  if (!sub) {
    sub = await generarSubdominio(deps.store, project.nombre);
    const ok = await deps.store.setSubdominio(input.orgId, input.projectId, sub);
    if (!ok) throw new PublishError("Ese subdominio ya está en uso", 409);
  }

  await deps.store.setPublished(input.orgId, input.projectId, current.id);
  await deps.deploy.publish({
    projectId: input.projectId, snapshotId: current.id,
    storagePrefix: current.storagePrefix, subdominio: sub,
  });
  return { subdominio: sub, publishedSnapshotId: current.id };
}

export async function unpublishSite(
  deps: { store: ProjectStore; deploy: DeployTarget },
  input: { orgId: string; projectId: string }
): Promise<void> {
  const project = await deps.store.getProject(input.orgId, input.projectId);
  if (!project) throw new PublishError("Proyecto no encontrado", 404);
  await deps.store.setPublished(input.orgId, input.projectId, null);
  if (project.subdominio) {
    await deps.deploy.unpublish({ projectId: input.projectId, subdominio: project.subdominio });
  }
}

export async function cambiarSubdominio(
  deps: { store: ProjectStore },
  input: { orgId: string; projectId: string; subdominio: string }
): Promise<{ subdominio: string }> {
  const project = await deps.store.getProject(input.orgId, input.projectId);
  if (!project) throw new PublishError("Proyecto no encontrado", 404);
  const sub = input.subdominio.trim().toLowerCase();
  if (!formatoSlugValido(sub)) {
    throw new PublishError("Subdominio no válido (minúsculas, números y guiones)", 400);
  }
  if (esReservado(sub)) throw new PublishError("Ese subdominio está reservado", 400);
  if (project.subdominio === sub) return { subdominio: sub };
  if (!(await deps.store.subdominioLibre(sub))) throw new PublishError("Ese subdominio ya está en uso", 409);
  const ok = await deps.store.setSubdominio(input.orgId, input.projectId, sub);
  if (!ok) throw new PublishError("Ese subdominio ya está en uso", 409);
  return { subdominio: sub };
}
