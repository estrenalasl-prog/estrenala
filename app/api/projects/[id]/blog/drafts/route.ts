import { NextResponse } from "next/server";
import { getContexto } from "@/src/auth/contexto";
import { projectStore } from "@/src/repositories/projects";
import { blogStore } from "@/src/repositories/blog";
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
    const drafts = await blogStore.listDrafts(orgId, id);
    return NextResponse.json(drafts.map((d) => ({
      id: d.id, keyword: d.keyword, estado: d.estado, titulo: d.titulo, createdAt: d.createdAt,
    })));
  } catch (e) { return conError(e); }
}

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const { orgId } = await getContexto();
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const keyword = (typeof body.keyword === "string" ? body.keyword : "").trim();
  try {
    if (!keyword) throw new EditorError("Escribe una keyword o tema para el artículo", 400);
    if (keyword.length > 200) throw new EditorError("La keyword es demasiado larga (máx. 200 caracteres)", 400);
    const project = await projectStore.getProject(orgId, id);
    if (!project) throw new EditorError("Proyecto no encontrado", 404);
    const settings = await blogStore.getBlogSettings(orgId, id);
    if (!settings?.nicho.trim()) throw new EditorError("Configura primero de qué va tu blog (campo Nicho)", 400);
    const r = await blogStore.createDraft(orgId, id, keyword);
    return NextResponse.json(r, { status: 201 });
  } catch (e) { return conError(e); }
}
