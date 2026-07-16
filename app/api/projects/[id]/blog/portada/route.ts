import { NextResponse } from "next/server";
import { getDevContext } from "@/src/auth/dev-stub";
import { getStorage } from "@/src/storage/factory";
import { projectStore } from "@/src/repositories/projects";
import { blogStore } from "@/src/repositories/blog";
import { generarPortada } from "@/src/blog/portada";
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
    const r = await generarPortada(
      { store: projectStore, blog: blogStore, storage: getStorage() },
      { orgId, projectId: id, titulo: s(body.titulo), modo: s(body.modo) }
    );
    return NextResponse.json(r, { status: 201 });
  } catch (e) { return conError(e); }
}
