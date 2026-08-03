import { NextResponse } from "next/server";
import { jsonError } from "@/src/auth/http";
import { getContexto } from "@/src/auth/contexto";
import { getStorage } from "@/src/storage/factory";
import { projectStore } from "@/src/repositories/projects";
import { previsualizarEdicion } from "@/src/editor/preview-edits";
import { EditorError } from "@/src/editor/errors";
import type { EditOp } from "@/src/editor/apply";

export const runtime = "nodejs";

// Cómo quedaría la página con lo que propone el asistente, sin guardar nada.
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const { orgId } = await getContexto();
  let body: { page?: unknown; ops?: EditOp[] };
  try {
    body = (await req.json()) as { page?: unknown; ops?: EditOp[] };
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }
  if (typeof body.page !== "string" || !body.page || !Array.isArray(body.ops)) {
    return NextResponse.json({ error: "Faltan página u ops" }, { status: 400 });
  }
  try {
    const { html } = await previsualizarEdicion(
      { store: projectStore, storage: getStorage() },
      { orgId, projectId: id, page: body.page, ops: body.ops }
    );
    return NextResponse.json({ html });
  } catch (e) {
    if (e instanceof EditorError) return jsonError(e.message, e.status);
    return jsonError("Error interno", 500);
  }
}
