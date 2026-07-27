import { NextResponse } from "next/server";
import { getContexto } from "@/src/auth/contexto";
import { exigirBlog } from "@/src/planes/guardas";
import { blogStore } from "@/src/repositories/blog";
import { errorJson } from "@/src/auth/http";

export const runtime = "nodejs";

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string; progId: string }> }) {
  const { id, progId } = await ctx.params;
  const { orgId } = await getContexto();
  try {
    await exigirBlog(orgId);
    const ok = await blogStore.borrarProgramado(orgId, id, progId);
    if (!ok) return NextResponse.json({ error: "Programación no encontrada" }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (e) { return errorJson(e); }
}
