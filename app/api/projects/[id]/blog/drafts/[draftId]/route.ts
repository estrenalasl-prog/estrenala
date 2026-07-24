import { NextResponse } from "next/server";
import { getContexto } from "@/src/auth/contexto";
import { blogStore } from "@/src/repositories/blog";
import { ETAPAS, etapaCompletada, siguienteEtapa } from "@/src/blog/pipeline";
import { EditorError } from "@/src/editor/errors";

export const runtime = "nodejs";

function conError(e: unknown) {
  if (e instanceof EditorError) return NextResponse.json({ error: e.message }, { status: e.status });
  return NextResponse.json({ error: "Error interno" }, { status: 500 });
}

export async function GET(_req: Request, ctx: { params: Promise<{ id: string; draftId: string }> }) {
  const { id, draftId } = await ctx.params;
  const { orgId } = await getContexto();
  try {
    const draft = await blogStore.getDraft(orgId, id, draftId);
    if (!draft) throw new EditorError("Borrador no encontrado", 404);
    return NextResponse.json({
      draft,
      etapas: ETAPAS.map((nombre) => ({ nombre, completada: etapaCompletada(draft, nombre) })),
      siguiente: siguienteEtapa(draft),
    });
  } catch (e) { return conError(e); }
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string; draftId: string }> }) {
  const { id, draftId } = await ctx.params;
  const { orgId } = await getContexto();
  try {
    const draft = await blogStore.getDraft(orgId, id, draftId);
    if (!draft) throw new EditorError("Borrador no encontrado", 404);
    await blogStore.deleteDraft(orgId, id, draftId);
    return NextResponse.json({ ok: true });
  } catch (e) { return conError(e); }
}
