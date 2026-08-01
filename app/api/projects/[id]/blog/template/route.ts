import { NextResponse } from "next/server";
import { getContexto } from "@/src/auth/contexto";
import { exigirBlog } from "@/src/planes/guardas";
import { getStorage } from "@/src/storage/factory";
import { projectStore } from "@/src/repositories/projects";
import { blogStore } from "@/src/repositories/blog";
import { guardarPlantillas } from "@/src/blog/apply";
import { generarPlantillas } from "@/src/blog/site-template";
import { plantillasDesdeHtml } from "@/src/blog/plantilla-propia";
import { EditorError } from "@/src/editor/errors";

export const runtime = "nodejs";

function conError(e: unknown) {
  if (e instanceof EditorError) return NextResponse.json({ error: e.message }, { status: e.status });
  return NextResponse.json({ error: "Error interno" }, { status: 500 });
}

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const { orgId } = await getContexto();
  try {
    await exigirBlog(orgId);
    const project = await projectStore.getProject(orgId, id);
    if (!project) throw new EditorError("Proyecto no encontrado", 404);
    const tpl = await blogStore.getBlogTemplate(orgId, id);
    if (!tpl) return NextResponse.json({ tplPost: null, tplIndex: null });
    return NextResponse.json(tpl);
  } catch (e) { return conError(e); }
}

/**
 * Dame las plantillas del blog. Dos caminos, el mismo destino:
 *
 *  - Sin cuerpo: la IA lee la portada y propone el diseño (lo de siempre).
 *  - Con `htmlPost`: el usuario trae SU plantilla y solo le colocamos los huecos.
 *
 * En los dos casos esto NO guarda nada: devuelve para que lo revise y luego
 * guarde con PUT.
 */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const { orgId } = await getContexto();
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const s = (v: unknown) => (typeof v === "string" ? v : "");
  try {
    await exigirBlog(orgId);
    const deps = { store: projectStore, storage: getStorage() };
    const plantillas = s(body.htmlPost).trim()
      ? await plantillasDesdeHtml(deps, {
          orgId, projectId: id, htmlPost: s(body.htmlPost), htmlIndex: s(body.htmlIndex),
        })
      : await generarPlantillas(deps, { orgId, projectId: id });
    return NextResponse.json(plantillas);
  } catch (e) { return conError(e); }
}

export async function PUT(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const { orgId } = await getContexto();
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const s = (v: unknown) => (typeof v === "string" ? v : "");
  try {
    await exigirBlog(orgId);
    const r = await guardarPlantillas(
      { store: projectStore, blog: blogStore, storage: getStorage() },
      { orgId, projectId: id, tplPost: s(body.tplPost), tplIndex: s(body.tplIndex) }
    );
    return NextResponse.json(r);
  } catch (e) { return conError(e); }
}
