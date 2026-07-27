import { NextResponse } from "next/server";
import { getContexto } from "@/src/auth/contexto";
import { exigirBlog } from "@/src/planes/guardas";
import { projectStore } from "@/src/repositories/projects";
import { blogStore } from "@/src/repositories/blog";
import { actualizarRadar } from "@/src/blog/radar";
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
  try {
    await exigirBlog(orgId);
    const r = await actualizarRadar(
      { store: projectStore, blog: blogStore, orgId, projectId: id },
      body.forzar === true
    );
    return NextResponse.json(r);
  } catch (e) { return conError(e); }
}
