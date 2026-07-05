import { crearSnapshotEditado } from "./snapshot-copy";
import { EditorError } from "./errors";
import {
  aplicarHerramienta, quitarHerramienta, estadoHerramientas, HeadToolsError,
  normalizarVerificacion, normalizarMedicion, rutaDeAssetValida,
  type Herramienta, type TipoHerramienta, type EstadoHerramientas,
} from "./head-tools";
import type { StorageAdapter } from "@/src/storage/types";
import type { ProjectStore } from "@/src/repositories/types";

type Deps = { store: ProjectStore; storage: StorageAdapter };

const TIPOS: TipoHerramienta[] = ["google-verification", "analytics", "favicon", "og-image"];

// Normaliza y valida la herramienta; para favicon/og-image comprueba que el asset es
// del proyecto y su archivo existe, y devuelve los bytes para copiarlos a wc-uploads
// (misma mecánica que las ops src de saveEdits: la web queda auto-contenida).
async function prepararHerramienta(
  deps: Deps, orgId: string, projectId: string, h: Herramienta
): Promise<{ herramienta: Herramienta; extras: Map<string, { body: Buffer; contentType: string }> }> {
  const extras = new Map<string, { body: Buffer; contentType: string }>();
  if (h.tipo === "google-verification") {
    const codigo = normalizarVerificacion(h.codigo ?? "");
    if (!codigo) throw new EditorError("Código de verificación no válido (pega la etiqueta de Google o solo el código)", 400);
    return { herramienta: { tipo: h.tipo, codigo }, extras };
  }
  if (h.tipo === "analytics") {
    const medicion = normalizarMedicion(h.medicion ?? "");
    if (!medicion) throw new EditorError("ID de Analytics no válido (ejemplo: G-ABC1DE23FG)", 400);
    return { herramienta: { tipo: h.tipo, medicion }, extras };
  }
  if (h.tipo === "favicon" || h.tipo === "og-image") {
    const ruta = (h.ruta ?? "").trim();
    if (!rutaDeAssetValida(ruta)) throw new EditorError("Imagen no válida", 400);
    const assetId = ruta.slice("/wc-uploads/".length).split(".")[0];
    const row = await deps.store.getAsset(orgId, projectId, assetId);
    if (!row) throw new EditorError("Imagen no válida", 400);
    const file = await deps.storage.get(row.storageKey);
    if (!file) throw new EditorError("Imagen no válida", 400);
    extras.set(ruta.replace(/^\//, ""), { body: file.body, contentType: row.contentType });
    return { herramienta: { tipo: h.tipo, ruta }, extras };
  }
  throw new EditorError("Herramienta desconocida", 400);
}

async function proyectoYActual(deps: Deps, orgId: string, projectId: string) {
  const project = await deps.store.getProject(orgId, projectId);
  if (!project) throw new EditorError("Proyecto no encontrado", 404);
  const current = await deps.store.getCurrentSnapshot(orgId, projectId);
  if (!current) throw new EditorError("El proyecto no tiene snapshot actual", 400);
  return { project, current };
}

export async function aplicarHerramientaAlProyecto(
  deps: Deps, input: { orgId: string; projectId: string; herramienta: Herramienta }
): Promise<{ snapshotId: string }> {
  const { current } = await proyectoYActual(deps, input.orgId, input.projectId);
  const { herramienta, extras } = await prepararHerramienta(deps, input.orgId, input.projectId, input.herramienta);
  try {
    return await crearSnapshotEditado(deps, {
      orgId: input.orgId, projectId: input.projectId,
      currentSnapshot: { id: current.id, storagePrefix: current.storagePrefix },
      transformar: (_rel, html) => aplicarHerramienta(html, herramienta),
      extras,
      operacionesJson: { herramienta },
    });
  } catch (e) {
    if (e instanceof HeadToolsError) throw new EditorError(e.message, e.status);
    throw e;
  }
}

export async function quitarHerramientaDelProyecto(
  deps: Deps, input: { orgId: string; projectId: string; tipo: TipoHerramienta }
): Promise<{ snapshotId: string }> {
  if (!TIPOS.includes(input.tipo)) throw new EditorError("Herramienta desconocida", 400);
  const { current } = await proyectoYActual(deps, input.orgId, input.projectId);
  return crearSnapshotEditado(deps, {
    orgId: input.orgId, projectId: input.projectId,
    currentSnapshot: { id: current.id, storagePrefix: current.storagePrefix },
    transformar: (_rel, html) => quitarHerramienta(html, input.tipo),
    operacionesJson: { quitarHerramienta: input.tipo },
  });
}

export async function estadoDeHerramientas(
  deps: Deps, input: { orgId: string; projectId: string }
): Promise<EstadoHerramientas> {
  const { project, current } = await proyectoYActual(deps, input.orgId, input.projectId);
  const file = await deps.storage.get(current.storagePrefix + project.entryPath);
  if (!file) return { googleVerification: null, analytics: null, favicon: null, ogImage: null };
  return estadoHerramientas(file.body.toString("utf-8"));
}
