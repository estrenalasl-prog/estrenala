import { NextResponse } from "next/server";
import { jsonError } from "@/src/auth/http";
import { getContexto } from "@/src/auth/contexto";
import { exigirBlog } from "@/src/planes/guardas";
import { blogStore } from "@/src/repositories/blog";
import { EditorError } from "@/src/editor/errors";

export const runtime = "nodejs";

const ESTADOS = ["nueva", "usada", "descartada"];

function conError(e: unknown) {
  if (e instanceof EditorError) return jsonError(e.message, e.status);
  return jsonError("Error interno", 500);
}

export async function PUT(req: Request, ctx: { params: Promise<{ id: string; kwId: string }> }) {
  const { id, kwId } = await ctx.params;
  const { orgId } = await getContexto();
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const estado = typeof body.estado === "string" ? body.estado : "";
  try {
    await exigirBlog(orgId);
    if (!ESTADOS.includes(estado)) throw new EditorError("Estado desconocido", 400);
    const ok = await blogStore.setKeywordEstado(orgId, id, kwId, estado);
    if (!ok) throw new EditorError("Keyword no encontrada", 404);
    return NextResponse.json({ ok: true });
  } catch (e) { return conError(e); }
}
