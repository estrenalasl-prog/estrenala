import { NextResponse } from "next/server";
import { getContexto } from "@/src/auth/contexto";
import { projectStore } from "@/src/repositories/projects";
import { getStorage } from "@/src/storage/factory";
import { esOwner, MSG_SOLO_OWNER } from "@/src/auth/roles";
import { errorJson, jsonError } from "@/src/auth/http";
import { detectarFormularios } from "@/src/forms/detectar";

export const runtime = "nodejs";

/**
 * La bandeja de una web y el estado de sus formularios.
 *
 * Solo el propietario. Aquí hay datos de TERCEROS —lo que le escribe la gente al
 * negocio de nuestro cliente—, y un editor entra a tocar la web, no a leer su
 * correspondencia. Mismo criterio que el aviso por correo.
 */
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const { orgId, rol } = await getContexto();
  if (!esOwner(rol)) return NextResponse.json({ error: MSG_SOLO_OWNER }, { status: 403 });

  const project = await projectStore.getProject(orgId, id);
  if (!project) return jsonError("Proyecto no encontrado", 404);

  try {
    const [envios, snapshot] = await Promise.all([
      projectStore.listarEnvios(orgId, id),
      projectStore.getCurrentSnapshot(orgId, id),
    ]);

    // Qué formularios tiene HOY la portada, para poder decirle si hay alguno que
    // no envía a ninguna parte. Se mira la página de inicio y no todas: recorrer
    // la web entera en cada visita a esta pantalla es caro, y el «Contacto» de
    // una web hecha con IA casi siempre está enlazado desde ahí o es la propia
    // portada.
    let detectados: { indice: number; estado: string; campos: string[] }[] = [];
    if (snapshot) {
      const f = await getStorage().get(snapshot.storagePrefix + project.entryPath);
      if (f) {
        detectados = detectarFormularios(f.body.toString("utf-8")).map((d) => ({
          indice: d.indice, estado: d.estado, campos: d.campos,
        }));
      }
    }

    return NextResponse.json({
      recoge: project.recogeFormularios,
      detectados,
      envios: envios.map((e) => ({
        id: e.id, pagina: e.pagina, formIndice: e.formIndice,
        datos: e.datos, leido: e.leido, cuando: e.createdAt.toISOString(),
      })),
    });
  } catch (e) {
    return errorJson(e);
  }
}

/** Encender o apagar la recogida, y marcar la bandeja como leída. */
export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const { orgId, rol } = await getContexto();
  if (!esOwner(rol)) return NextResponse.json({ error: MSG_SOLO_OWNER }, { status: 403 });

  const project = await projectStore.getProject(orgId, id);
  if (!project) return jsonError("Proyecto no encontrado", 404);

  const body = (await req.json().catch(() => ({}))) as { recoge?: unknown; leidos?: unknown };
  try {
    if (typeof body.recoge === "boolean") {
      await projectStore.setRecogeFormularios(orgId, id, body.recoge);
      return NextResponse.json({ recoge: body.recoge });
    }
    if (body.leidos === true) {
      await projectStore.marcarEnviosLeidos(orgId, id);
      return NextResponse.json({ ok: true });
    }
    return jsonError("No hay nada que cambiar", 400);
  } catch (e) {
    return errorJson(e);
  }
}
