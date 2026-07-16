import { actualizarRadar } from "@/src/blog/radar";
import { ejecutarEtapa, siguienteEtapa, type Etapa } from "@/src/blog/pipeline";
import { generarPortada } from "@/src/blog/portada";
import { programarPost } from "@/src/blog/programados";
import { claveOpenRouter, claveSerpApi } from "@/src/config/claves";
import type { StorageAdapter } from "@/src/storage/types";
import type { ProjectStore } from "@/src/repositories/types";
import type { BlogStore } from "@/src/repositories/blog";

export type DepsPiloto = { store: ProjectStore; blog: BlogStore; storage: StorageAdapter };

// Solo se redacta si el radar encontró un tema que DE VERDAD encaja: por debajo
// de esto, el día se salta y no se gasta nada en el pipeline.
export const PILOTO_RELEVANCIA_MINIMA = 60;
const MARGEN_PUBLICACION_MS = 5 * 60_000; // ventana para cancelar desde «Programados»

function diaLocal(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function diasEntre(a: string, b: string): number {
  return Math.round((Date.parse(b) - Date.parse(a)) / 86_400_000);
}

// Piloto automático (4g): para cada proyecto con el piloto activo y "en hora",
// reclama el día (dos ticks solapados: uno) y ejecuta el circuito completo.
// Todo resultado — éxito o fallo — queda en piloto_ultimo_msg: el usuario
// siempre sabe qué hizo el piloto y por qué. Máximo 1 artículo por ejecución.
export async function pilotoTick(
  deps: DepsPiloto,
  ahora = new Date()
): Promise<{ ejecutados: number; publicados: number }> {
  const hoy = diaLocal(ahora);
  let ejecutados = 0;
  let publicados = 0;
  for (const p of await deps.blog.listPilotosActivos()) {
    if (ahora.getHours() < p.hora) continue;
    if (p.ultimoDia && diasEntre(p.ultimoDia, hoy) < p.cadaDias) continue;
    if (!(await deps.blog.reclamarPiloto(p.projectId, hoy))) continue;
    ejecutados += 1;
    if (await ejecutarPiloto(deps, p.orgId, p.projectId, p.portada, ahora)) publicados += 1;
  }
  return { ejecutados, publicados };
}

async function ejecutarPiloto(
  deps: DepsPiloto,
  orgId: string,
  projectId: string,
  modoPortada: string,
  ahora: Date
): Promise<boolean> {
  const registrar = (msg: string) => deps.blog.registrarPiloto(projectId, msg);
  try {
    // 1) Sin claves no se arranca (y no se reintenta hasta el día siguiente).
    if (!(await claveOpenRouter())) {
      await registrar("El piloto no arrancó: falta la clave de OpenRouter (Configuración)");
      return false;
    }
    if (!(await claveSerpApi())) {
      await registrar("El piloto no arrancó: falta la clave de SerpAPI (Configuración)");
      return false;
    }

    // 2) Radar (la caché diaria del 4c hace que sea gratis si ya corrió hoy).
    await actualizarRadar({ store: deps.store, blog: deps.blog, orgId, projectId });

    // 3) El mejor tema nuevo por encima del corte (la lista ya viene por relevancia desc).
    const tema = (await deps.blog.listKeywords(orgId, projectId))
      .find((k) => k.estado === "nueva" && k.relevancia > PILOTO_RELEVANCIA_MINIMA);
    if (!tema) {
      await registrar("Hoy no había ningún tema con relevancia > 60: no se gastó nada en redactar");
      return false;
    }

    // 4) Borrador + pipeline completo con el modelo del usuario.
    const { draftId } = await deps.blog.createDraft(orgId, projectId, tema.keyword);
    await deps.blog.setKeywordEstado(orgId, projectId, tema.id, "usada");
    const depsPipe = { store: deps.store, blog: deps.blog, orgId, projectId };
    let draft = await deps.blog.getDraft(orgId, projectId, draftId);
    let etapa: Etapa | null;
    while (draft && (etapa = siguienteEtapa(draft))) {
      const r = await ejecutarEtapa(depsPipe, draftId, etapa);
      if (!r.ok) {
        await registrar(`El borrador quedó en error en la etapa ${etapa}: ${r.error} (revísalo en el panel del blog)`);
        return false;
      }
      draft = await deps.blog.getDraft(orgId, projectId, draftId);
    }
    if (!draft?.titulo || !draft.slug || !draft.metaDescripcion || !draft.articuloMd) {
      await registrar("El borrador terminó incompleto (revísalo en el panel del blog)");
      return false;
    }

    // 5) Portada con el modo configurado; si la IA falla, el diseño gratis salva el día.
    const depsPortada = { store: deps.store, blog: deps.blog, storage: deps.storage };
    let portada: { assetId: string; url: string };
    try {
      portada = await generarPortada(depsPortada, { orgId, projectId, titulo: draft.titulo, modo: modoPortada });
    } catch (e) {
      if (modoPortada === "diseno") throw e;
      portada = await generarPortada(depsPortada, { orgId, projectId, titulo: draft.titulo, modo: "diseno" });
    }

    // 6) Programar a +5 min (entra en el flujo 4e: rastro y cancelación en «Programados»).
    try {
      await programarPost({ store: deps.store, blog: deps.blog, storage: deps.storage }, {
        orgId, projectId,
        titulo: draft.titulo, slug: draft.slug, metaDescripcion: draft.metaDescripcion,
        md: draft.articuloMd, imagenAssetId: portada.assetId,
        publicarEn: new Date(ahora.getTime() + MARGEN_PUBLICACION_MS).toISOString(),
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      await registrar(`No se pudo programar el artículo: ${msg} (el borrador sigue en el panel)`);
      return false;
    }
    await deps.blog.deleteDraft(orgId, projectId, draftId);
    await registrar(`Artículo «${draft.titulo}» programado (tema: ${tema.keyword}, relevancia ${tema.relevancia})`);
    return true;
  } catch (e) {
    await registrar(`El piloto falló: ${e instanceof Error ? e.message : String(e)}`);
    return false;
  }
}
