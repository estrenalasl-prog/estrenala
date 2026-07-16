import { NextResponse } from "next/server";
import { getDevContext } from "@/src/auth/dev-stub";
import { blogStore } from "@/src/repositories/blog";

export const runtime = "nodejs";

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string; progId: string }> }) {
  const { id, progId } = await ctx.params;
  const { orgId } = await getDevContext();
  const ok = await blogStore.borrarProgramado(orgId, id, progId);
  if (!ok) return NextResponse.json({ error: "Programación no encontrada" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
