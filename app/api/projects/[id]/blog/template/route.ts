import { NextResponse } from "next/server";
import { getContexto } from "@/src/auth/contexto";
import { getStorage } from "@/src/storage/factory";
import { projectStore } from "@/src/repositories/projects";
import { blogStore } from "@/src/repositories/blog";
import { guardarPlantillas } from "@/src/blog/apply";
import { generarPlantillas } from "@/src/blog/site-template";
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
    const project = await projectStore.getProject(orgId, id);
    if (!project) throw new EditorError("Proyecto no encontrado", 404);
    const tpl = await blogStore.getBlogTemplate(orgId, id);
    if (!tpl) return NextResponse.json({ tplPost: null, tplIndex: null });
    return NextResponse.json(tpl);
  } catch (e) { return conError(e); }
}

export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const { orgId } = await getContexto();
  try {
    const plantillas = await generarPlantillas(
      { store: projectStore, storage: getStorage() },
      { orgId, projectId: id }
    );
    return NextResponse.json(plantillas);
  } catch (e) { return conError(e); }
}

export async function PUT(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const { orgId } = await getContexto();
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const s = (v: unknown) => (typeof v === "string" ? v : "");
  try {
    const r = await guardarPlantillas(
      { store: projectStore, blog: blogStore, storage: getStorage() },
      { orgId, projectId: id, tplPost: s(body.tplPost), tplIndex: s(body.tplIndex) }
    );
    return NextResponse.json(r);
  } catch (e) { return conError(e); }
}
