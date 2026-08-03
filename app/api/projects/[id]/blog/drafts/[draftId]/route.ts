import { NextResponse } from "next/server";
import { jsonError } from "@/src/auth/http";
import { getContexto } from "@/src/auth/contexto";
import { exigirBlog } from "@/src/planes/guardas";
import { blogStore } from "@/src/repositories/blog";
import { ETAPAS, etapaCompletada, siguienteEtapa } from "@/src/blog/pipeline";
import { EditorError } from "@/src/editor/errors";

export const runtime = "nodejs";

function conError(e: unknown) {
  if (e instanceof EditorError) return jsonError(e.message, e.status);
  return jsonError("Error interno", 500);
}

export async function GET(_req: Request, ctx: { params: Promise<{ id: string; draftId: string }> }) {
  const { id, draftId } = await ctx.params;
  const { orgId } = await getContexto();
  try {
    await exigirBlog(orgId);
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
    await exigirBlog(orgId);
    const draft = await blogStore.getDraft(orgId, id, draftId);
    if (!draft) throw new EditorError("Borrador no encontrado", 404);
    await blogStore.deleteDraft(orgId, id, draftId);
    return NextResponse.json({ ok: true });
  } catch (e) { return conError(e); }
}
