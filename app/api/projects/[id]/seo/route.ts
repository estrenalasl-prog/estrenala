import { NextResponse } from "next/server";
import { getContexto } from "@/src/auth/contexto";
import { projectStore } from "@/src/repositories/projects";
import { getStorage } from "@/src/storage/factory";
import { errorJson, jsonError } from "@/src/auth/http";
import { examinarProyecto } from "@/src/seo/sitio";

export const runtime = "nodejs";

/**
 * El examen de SEO de una web.
 *
 * A diferencia de la bandeja de formularios, esto SÍ lo ve un editor: aquí no
 * hay datos de terceros, solo cómo de bien está hecha la web que ha venido a
 * editar. Es justo lo que necesita saber para hacer su trabajo.
 */
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const { orgId } = await getContexto();

  const project = await projectStore.getProject(orgId, id);
  if (!project) return jsonError("Proyecto no encontrado", 404);

  try {
    const snapshot = await projectStore.getCurrentSnapshot(orgId, id);
    if (!snapshot) return NextResponse.json({ sinPublicar: true });

    const examen = await examinarProyecto(getStorage(), {
      snapshotId: snapshot.id,
      storagePrefix: snapshot.storagePrefix,
      entryPath: project.entryPath,
    });

    // El detalle por página no se manda: son 25 objetos con títulos y
    // descripciones enteros para pintar una lista de ocho líneas. Lo que hace
    // falta —dónde está cada fallo— ya viaja dentro de cada fallo.
    return NextResponse.json({
      nota: examen.nota,
      examinadas: examen.examinadas,
      totales: examen.totales,
      fallos: examen.fallos,
    });
  } catch (e) {
    return errorJson(e);
  }
}
