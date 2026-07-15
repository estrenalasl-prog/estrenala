import { NextResponse } from "next/server";
import { getDevContext } from "@/src/auth/dev-stub";
import { blogStore } from "@/src/repositories/blog";
import { EditorError } from "@/src/editor/errors";

export const runtime = "nodejs";

const ESTADOS = ["nueva", "usada", "descartada"];

function conError(e: unknown) {
  if (e instanceof EditorError) return NextResponse.json({ error: e.message }, { status: e.status });
  return NextResponse.json({ error: "Error interno" }, { status: 500 });
}

export async function PUT(req: Request, ctx: { params: Promise<{ id: string; kwId: string }> }) {
  const { id, kwId } = await ctx.params;
  const { orgId } = await getDevContext();
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const estado = typeof body.estado === "string" ? body.estado : "";
  try {
    if (!ESTADOS.includes(estado)) throw new EditorError("Estado desconocido", 400);
    const ok = await blogStore.setKeywordEstado(orgId, id, kwId, estado);
    if (!ok) throw new EditorError("Keyword no encontrada", 404);
    return NextResponse.json({ ok: true });
  } catch (e) { return conError(e); }
}
