import { NextResponse } from "next/server";
import { getContexto } from "@/src/auth/contexto";
import { exigirBlog } from "@/src/planes/guardas";
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
    await exigirBlog(orgId);
    const project = await projectStore.getProject(orgId, id);
    if (!project) throw new EditorError("Proyecto no encontrado", 404);
    const keywords = await blogStore.listKeywords(orgId, id);
    return NextResponse.json(keywords
      .filter((k) => k.estado !== "descartada")
      .map((k) => ({
        id: k.id, keyword: k.keyword, fuente: k.fuente,
        crecimientoPct: k.crecimientoPct, volumenAprox: k.volumenAprox,
        relevancia: k.relevancia, estado: k.estado, discoveredAt: k.discoveredAt,
      })));
  } catch (e) { return conError(e); }
}
