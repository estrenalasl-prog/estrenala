import { NextResponse } from "next/server";
import { getDevContext } from "@/src/auth/dev-stub";
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
  const { orgId } = await getDevContext();
  try {
    const project = await projectStore.getProject(orgId, id);
    if (!project) throw new EditorError("Proyecto no encontrado", 404);
    const settings = await blogStore.getBlogSettings(orgId, id);
    return NextResponse.json(settings ?? { nicho: "", idioma: "es", keywordsSemilla: "" });
  } catch (e) { return conError(e); }
}

export async function PUT(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const { orgId } = await getDevContext();
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const s = (v: unknown) => (typeof v === "string" ? v : "");
  try {
    const nicho = s(body.nicho);
    if (nicho.length > 2000) throw new EditorError("El nicho es demasiado largo (máx. 2000 caracteres)", 400);
    const keywordsSemilla = s(body.keywordsSemilla).trim();
    if (keywordsSemilla.length > 500) throw new EditorError("Las keywords semilla son demasiado largas (máx. 500 caracteres)", 400);
    const project = await projectStore.getProject(orgId, id);
    if (!project) throw new EditorError("Proyecto no encontrado", 404);
    const previo = await blogStore.getBlogSettings(orgId, id);
    const idioma = s(body.idioma) || previo?.idioma || "es";
    await blogStore.setBlogSettings(orgId, id, { nicho, idioma, keywordsSemilla });
    return NextResponse.json({ ok: true });
  } catch (e) { return conError(e); }
}
