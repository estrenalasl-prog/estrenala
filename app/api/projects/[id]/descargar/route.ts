import { jsonError } from "@/src/auth/http";
import { getContexto } from "@/src/auth/contexto";
import { projectStore } from "@/src/repositories/projects";
import { getStorage } from "@/src/storage/factory";
import { empaquetarWeb } from "@/src/export/descargar";

export const runtime = "nodejs";

// «Descargar mi web»: la instantánea actual en un ZIP. Es un <a href>, no un
// fetch: el navegador ve el attachment y descarga sin salir de la pantalla.
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const { orgId } = await getContexto();
  const r = await empaquetarWeb({ store: projectStore, storage: getStorage() }, { orgId, projectId: id });
  if (!r) return jsonError("Proyecto no encontrado", 404);
  return new Response(new Uint8Array(r.zip), {
    headers: {
      "content-type": "application/zip",
      "content-disposition": `attachment; filename="${r.nombreArchivo}"`,
      // Cada descarga empaqueta lo de AHORA: guardarla serviría versiones viejas.
      "cache-control": "no-store",
    },
  });
}
