import { NextResponse } from "next/server";
import { jsonError } from "@/src/auth/http";
import { getContexto } from "@/src/auth/contexto";
import { getStorage } from "@/src/storage/factory";
import { projectStore } from "@/src/repositories/projects";
import { actualizarProyecto } from "@/src/projects/actualizar";
import { ImportError } from "@/src/import/unzip";
import { EditorError } from "@/src/editor/errors";
import { permitirIntento, ipDe } from "@/src/auth/rate-limit";
import { ocuparSitio, subidasEnCurso, ESPERA_SEGUNDOS } from "@/src/import/aforo";

export const runtime = "nodejs";

// Actualiza la web con un ZIP nuevo (crea un snapshot y lo deja como actual). Es
// trabajo de edición → lo pueden hacer editor y propietario (getContexto basta).
/**
 * El mismo tope de cuerpo que al crear un proyecto (ver app/api/projects/route.ts).
 *
 * Esta puerta se quedó fuera del repaso del 2026-09-02 y es la MÁS expuesta de
 * las dos: crear proyectos lo frena el plan —una web en el gratuito—, pero
 * actualizar el ZIP se puede repetir todas las veces que uno quiera sobre el
 * mismo proyecto.
 */
const MAX_CUERPO = 60 * 1024 * 1024;

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const largo = Number(req.headers.get("content-length") ?? 0);
  if (Number.isFinite(largo) && largo > MAX_CUERPO) {
    return jsonError("Lo que has subido supera 50 MB", 413);
  }
  if (!permitirIntento(`actualizar|${ipDe(req)}`)) {
    return jsonError("Demasiados intentos, espera un momento", 429);
  }

  const { id } = await ctx.params;
  const { orgId } = await getContexto();

  let soltar: () => void;
  try {
    soltar = ocuparSitio();
  } catch (e) {
    if (e instanceof EditorError) {
      // Igual que al crear: sin esta línea el 503 no existe para nadie. Y esta
      // puerta importa más, porque actualizar se puede repetir sin que el plan
      // lo frene (ver docs/ESCALAR-SUBIDAS.md).
      console.error(`aforo: actualización rechazada (${subidasEnCurso()} en curso)`);
      const res = await jsonError(e.message, e.status);
      res.headers.set("retry-after", String(ESPERA_SEGUNDOS));
      return res;
    }
    throw e;
  }

  try {
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return jsonError("Falta el archivo ZIP", 400);
    const zip = Buffer.from(await file.arrayBuffer());
    const { snapshotId } = await actualizarProyecto(
      { store: projectStore, storage: getStorage() },
      { orgId, projectId: id, zip }
    );
    return NextResponse.json({ snapshotId }, { status: 201 });
  } catch (e) {
    if (e instanceof ImportError) return jsonError(e.message, 400);
    if (e instanceof EditorError) return jsonError(e.message, e.status);
    // Igual que al crear: lo que llegue aquí es la base de datos, el
    // almacenamiento o un bug, y su mensaje trae nombres de dentro de casa.
    console.error("actualizar: fallo inesperado", e instanceof Error ? e.message : e);
    return jsonError("No se pudo subir la web", 500);
  } finally {
    // SIN ESTO la puerta se cierra para siempre: el contador sube y no vuelve a
    // bajar, y a la sexta subida nadie más puede subir hasta que se reinicie.
    soltar();
  }
}
