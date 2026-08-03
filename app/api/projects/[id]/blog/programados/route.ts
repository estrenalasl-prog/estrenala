import { NextResponse } from "next/server";
import { jsonError } from "@/src/auth/http";
import { getContexto } from "@/src/auth/contexto";
import { exigirBlog } from "@/src/planes/guardas";
import { getStorage } from "@/src/storage/factory";
import { projectStore } from "@/src/repositories/projects";
import { blogStore } from "@/src/repositories/blog";
import { programarPost } from "@/src/blog/programados";
import { EditorError } from "@/src/editor/errors";

export const runtime = "nodejs";

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
    const filas = await blogStore.listProgramados(orgId, id);
    // md/meta/imagen viajan también: «Editar» carga el contenido en el editor.
    return NextResponse.json(filas.map((f) => ({
      id: f.id, titulo: f.titulo, slug: f.slug, metaDescripcion: f.metaDescripcion,
      md: f.md, imagenAssetId: f.imagenAssetId, publicarEn: f.publicarEn,
      estado: f.estado, errorMsg: f.errorMsg, postId: f.postId,
    })));
  } catch (e) { return conError(e); }
}

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const { orgId } = await getContexto();
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const s = (v: unknown) => (typeof v === "string" ? v : "");
  try {
    await exigirBlog(orgId);
    const r = await programarPost(
      { store: projectStore, blog: blogStore, storage: getStorage() },
      {
        orgId,
        projectId: id,
        titulo: s(body.titulo),
        slug: s(body.slug),
        metaDescripcion: s(body.metaDescripcion),
        md: s(body.md),
        imagenAssetId: s(body.imagenAssetId),
        publicarEn: s(body.publicarEn),
      }
    );
    return NextResponse.json(r, { status: 201 });
  } catch (e) { return conError(e); }
}
