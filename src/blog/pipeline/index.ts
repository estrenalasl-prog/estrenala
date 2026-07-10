import { EditorError } from "@/src/editor/errors";
import { basePublica } from "@/src/blog/render";
import { sitesBaseDomain } from "@/src/blog/apply";
import type { DraftRow } from "@/src/repositories/blog";
import { ETAPAS, type Contexto, type DepsPipeline, type Etapa, type FnEtapa } from "./tipos";
import { etapaAnalisis } from "./analisis";
import { etapaPlan } from "./plan";
import { etapaInvestigacion } from "./investigacion";
import { etapaRedaccion } from "./redaccion";
import { etapaLinks } from "./links";
import { etapaMetadatos } from "./metadatos";

export { ETAPAS, type Etapa, type DepsPipeline } from "./tipos";

const FUNCIONES: Record<Etapa, FnEtapa> = {
  analisis: etapaAnalisis,
  plan: etapaPlan,
  investigacion: etapaInvestigacion,
  redaccion: etapaRedaccion,
  links: etapaLinks,
  metadatos: etapaMetadatos,
};

export function etapaCompletada(draft: DraftRow, etapa: Etapa): boolean {
  switch (etapa) {
    case "analisis": return !!draft.analisisJson;
    case "plan": return !!draft.planMd;
    case "investigacion": return !!draft.investigacionMd;
    case "redaccion": return !!draft.articuloMd;
    case "links": return draft.linksHechos === 1;
    case "metadatos": return !!(draft.titulo && draft.slug && draft.metaDescripcion);
  }
}

export function siguienteEtapa(draft: DraftRow): Etapa | null {
  for (const e of ETAPAS) if (!etapaCompletada(draft, e)) return e;
  return null;
}

// Ejecuta UNA etapa del borrador: valida prerrequisitos (lanza EditorError),
// persiste el artefacto como checkpoint y pasa a `revision` si ya no queda nada.
// Los fallos de ejecución NO se lanzan: quedan en estado=error + errorMsg.
export async function ejecutarEtapa(
  deps: DepsPipeline,
  draftId: string,
  etapa: Etapa,
  instruccion?: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const draft = await deps.blog.getDraft(deps.orgId, deps.projectId, draftId);
  if (!draft) throw new EditorError("Borrador no encontrado", 404);
  const project = await deps.store.getProject(deps.orgId, deps.projectId);
  if (!project) throw new EditorError("Proyecto no encontrado", 404);
  const settings = await deps.blog.getBlogSettings(deps.orgId, deps.projectId);
  const ctx: Contexto = {
    nombre: project.nombre,
    nicho: settings?.nicho ?? "",
    idioma: settings?.idioma ?? "es",
    base: basePublica(project, sitesBaseDomain()) ?? "",
    modelo: settings?.modelo ?? "",
  };

  const idx = ETAPAS.indexOf(etapa);
  for (const previa of ETAPAS.slice(0, idx)) {
    if (!etapaCompletada(draft, previa)) {
      throw new EditorError(`Antes hay que completar la etapa "${previa}"`, 400);
    }
  }

  try {
    const cambios = await FUNCIONES[etapa](draft, ctx, deps, instruccion);
    await deps.blog.updateDraft(deps.orgId, deps.projectId, draftId, { ...cambios, errorMsg: null, estado: "pipeline" });
    const actualizado = await deps.blog.getDraft(deps.orgId, deps.projectId, draftId);
    if (actualizado && siguienteEtapa(actualizado) === null) {
      await deps.blog.updateDraft(deps.orgId, deps.projectId, draftId, { estado: "revision" });
    }
    return { ok: true as const };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await deps.blog.updateDraft(deps.orgId, deps.projectId, draftId, { estado: "error", errorMsg: `[${etapa}] ${msg}` });
    return { ok: false as const, error: msg };
  }
}
