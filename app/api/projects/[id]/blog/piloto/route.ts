import { NextResponse } from "next/server";
import { jsonError } from "@/src/auth/http";
import { getContexto } from "@/src/auth/contexto";
import { exigirBlog } from "@/src/planes/guardas";
import { projectStore } from "@/src/repositories/projects";
import { blogStore } from "@/src/repositories/blog";
import { EditorError } from "@/src/editor/errors";

export const runtime = "nodejs";

const DEFAULTS = { activo: false, cadaDias: 1, hora: 9, portada: "diseno", ultimoDia: null, ultimoMsg: null };

function conError(e: unknown) {
  if (e instanceof EditorError) return jsonError(e.message, e.status);
  return jsonError("Error interno", 500);
}

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const { orgId } = await getContexto();
  try {
    await exigirBlog(orgId);
    const project = await projectStore.getProject(orgId, id);
    if (!project) throw new EditorError("Proyecto no encontrado", 404);
    const piloto = await blogStore.getPiloto(orgId, id);
    return NextResponse.json(piloto ?? DEFAULTS);
  } catch (e) { return conError(e); }
}

export async function PUT(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const { orgId } = await getContexto();
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  try {
    await exigirBlog(orgId);
    const project = await projectStore.getProject(orgId, id);
    if (!project) throw new EditorError("Proyecto no encontrado", 404);
    const cadaDias = Number(body.cadaDias);
    if (![1, 3, 7].includes(cadaDias)) throw new EditorError("Frecuencia no válida", 400);
    const hora = Number(body.hora);
    if (!Number.isInteger(hora) || hora < 0 || hora > 23) throw new EditorError("Hora no válida", 400);
    const portada = typeof body.portada === "string" ? body.portada : "";
    if (portada !== "diseno" && portada !== "ia") throw new EditorError("Portada no válida", 400);
    await blogStore.setPiloto(orgId, id, { activo: body.activo === true, cadaDias, hora, portada });
    return NextResponse.json({ ok: true });
  } catch (e) { return conError(e); }
}
