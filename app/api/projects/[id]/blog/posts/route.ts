import { NextResponse } from "next/server";
import { getDevContext } from "@/src/auth/dev-stub";
import { getStorage } from "@/src/storage/factory";
import { projectStore } from "@/src/repositories/projects";
import { blogStore } from "@/src/repositories/blog";
import { guardarPost } from "@/src/blog/apply";
import { EditorError } from "@/src/editor/errors";

export const runtime = "nodejs";

function conError(e: unknown) {
  if (e instanceof EditorError) return NextResponse.json({ error: e.message }, { status: e.status });
  return NextResponse.json({ error: "Error interno" }, { status: 500 });
}

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const { orgId } = await getDevContext();
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const s = (v: unknown) => (typeof v === "string" ? v : "");
  try {
    const r = await guardarPost(
      { store: projectStore, blog: blogStore, storage: getStorage() },
      {
        orgId,
        projectId: id,
        titulo: s(body.titulo),
        slug: s(body.slug),
        metaDescripcion: s(body.metaDescripcion),
        md: s(body.md),
        imagenAssetId: s(body.imagenAssetId),
      }
    );
    return NextResponse.json(r, { status: 201 });
  } catch (e) { return conError(e); }
}
