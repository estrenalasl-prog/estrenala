import { NextResponse } from "next/server";
import { getDevContext } from "@/src/auth/dev-stub";
import { projectStore } from "@/src/repositories/projects";
import { blogStore } from "@/src/repositories/blog";
import { ETAPAS, ejecutarEtapa, type Etapa } from "@/src/blog/pipeline";
import { EditorError } from "@/src/editor/errors";

export const runtime = "nodejs";

function conError(e: unknown) {
  if (e instanceof EditorError) return NextResponse.json({ error: e.message }, { status: e.status });
  return NextResponse.json({ error: "Error interno" }, { status: 500 });
}

export async function POST(req: Request, ctx: { params: Promise<{ id: string; draftId: string }> }) {
  const { id, draftId } = await ctx.params;
  const { orgId } = await getDevContext();
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const etapa = typeof body.etapa === "string" ? body.etapa : "";
  const instruccion = (typeof body.instruccion === "string" ? body.instruccion : "").trim();
  try {
    if (!(ETAPAS as readonly string[]).includes(etapa)) throw new EditorError("Etapa desconocida", 400);
    if (instruccion.length > 1000) throw new EditorError("La instrucción es demasiado larga (máx. 1000 caracteres)", 400);
    const r = await ejecutarEtapa(
      { store: projectStore, blog: blogStore, orgId, projectId: id },
      draftId,
      etapa as Etapa,
      instruccion || undefined
    );
    if (r.ok) return NextResponse.json({ ok: true });
    return NextResponse.json({ ok: false, error: r.error }, { status: 500 });
  } catch (e) { return conError(e); }
}
