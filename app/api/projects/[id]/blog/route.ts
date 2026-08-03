import { NextResponse } from "next/server";
import { jsonError } from "@/src/auth/http";
import { getContexto } from "@/src/auth/contexto";
import { exigirBlog } from "@/src/planes/guardas";
import { getStorage } from "@/src/storage/factory";
import { projectStore } from "@/src/repositories/projects";
import { blogStore } from "@/src/repositories/blog";
import { estadoBlog } from "@/src/blog/apply";
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
    const estado = await estadoBlog(
      { store: projectStore, blog: blogStore, storage: getStorage() },
      { orgId, projectId: id }
    );
    return NextResponse.json(estado);
  } catch (e) { return conError(e); }
}
