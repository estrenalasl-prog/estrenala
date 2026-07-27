import { NextResponse } from "next/server";
import { getContexto } from "@/src/auth/contexto";
import { exigirBlog } from "@/src/planes/guardas";
import { getStorage } from "@/src/storage/factory";
import { projectStore } from "@/src/repositories/projects";
import { blogStore } from "@/src/repositories/blog";
import { previewBlog } from "@/src/blog/apply";
import { EditorError } from "@/src/editor/errors";

export const runtime = "nodejs";

function conError(e: unknown) {
  if (e instanceof EditorError) return NextResponse.json({ error: e.message }, { status: e.status });
  return NextResponse.json({ error: "Error interno" }, { status: 500 });
}

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const { orgId } = await getContexto();
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const s = (v: unknown) => (typeof v === "string" ? v : undefined);
  try {
    await exigirBlog(orgId);
    const html = await previewBlog(
      { store: projectStore, blog: blogStore, storage: getStorage() },
      {
        orgId,
        projectId: id,
        cual: (typeof body.cual === "string" ? body.cual : undefined) as "post" | "index" | undefined,
        tplPost: s(body.tplPost),
        tplIndex: s(body.tplIndex),
        titulo: s(body.titulo),
        slug: s(body.slug),
        metaDescripcion: s(body.metaDescripcion),
        md: s(body.md),
        imagenUrl: s(body.imagenUrl),
      }
    );
    return NextResponse.json(html);
  } catch (e) { return conError(e); }
}
