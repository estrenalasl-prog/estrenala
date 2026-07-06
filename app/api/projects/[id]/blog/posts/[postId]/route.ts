import { NextResponse } from "next/server";
import { getDevContext } from "@/src/auth/dev-stub";
import { getStorage } from "@/src/storage/factory";
import { projectStore } from "@/src/repositories/projects";
import { blogStore } from "@/src/repositories/blog";
import { guardarPost, borrarPost } from "@/src/blog/apply";
import { EditorError } from "@/src/editor/errors";

export const runtime = "nodejs";

function conError(e: unknown) {
  if (e instanceof EditorError) return NextResponse.json({ error: e.message }, { status: e.status });
  return NextResponse.json({ error: "Error interno" }, { status: 500 });
}

export async function GET(_req: Request, ctx: { params: Promise<{ id: string; postId: string }> }) {
  const { id, postId } = await ctx.params;
  const { orgId } = await getDevContext();
  try {
    const project = await projectStore.getProject(orgId, id);
    if (!project) throw new EditorError("Proyecto no encontrado", 404);
    const post = await blogStore.getPost(orgId, id, postId);
    if (!post) throw new EditorError("Artículo no encontrado", 404);
    return NextResponse.json(post);
  } catch (e) { return conError(e); }
}

export async function PUT(req: Request, ctx: { params: Promise<{ id: string; postId: string }> }) {
  const { id, postId } = await ctx.params;
  const { orgId } = await getDevContext();
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const s = (v: unknown) => (typeof v === "string" ? v : "");
  try {
    const r = await guardarPost(
      { store: projectStore, blog: blogStore, storage: getStorage() },
      {
        orgId,
        projectId: id,
        postId,
        titulo: s(body.titulo),
        slug: s(body.slug),
        metaDescripcion: s(body.metaDescripcion),
        md: s(body.md),
        imagenAssetId: s(body.imagenAssetId),
      }
    );
    return NextResponse.json(r);
  } catch (e) { return conError(e); }
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string; postId: string }> }) {
  const { id, postId } = await ctx.params;
  const { orgId } = await getDevContext();
  try {
    const r = await borrarPost(
      { store: projectStore, blog: blogStore, storage: getStorage() },
      { orgId, projectId: id, postId }
    );
    return NextResponse.json(r);
  } catch (e) { return conError(e); }
}
