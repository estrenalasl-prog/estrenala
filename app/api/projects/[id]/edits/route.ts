import { NextResponse } from "next/server";
import { jsonError } from "@/src/auth/http";
import { getContexto } from "@/src/auth/contexto";
import { getStorage } from "@/src/storage/factory";
import { projectStore } from "@/src/repositories/projects";
import { saveEdits } from "@/src/editor/save-edits";
import { EditorError } from "@/src/editor/errors";
import type { EditOp } from "@/src/editor/apply";

export const runtime = "nodejs";

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const { orgId } = await getContexto();
  let body: { ops?: EditOp[]; origen?: unknown };
  try {
    body = (await req.json()) as { ops?: EditOp[]; origen?: unknown };
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }
  if (!Array.isArray(body.ops)) {
    return NextResponse.json({ error: "Faltan ops" }, { status: 400 });
  }
  // Solo se reconoce el valor exacto; cualquier otra cosa cuenta como edición a
  // mano. Es una etiqueta para el Historial, no un permiso.
  const origen = body.origen === "ia" ? "ia" : undefined;
  try {
    const { snapshotId } = await saveEdits(
      { store: projectStore, storage: getStorage() },
      { orgId, projectId: id, ops: body.ops, origen }
    );
    return NextResponse.json({ snapshotId }, { status: 201 });
  } catch (e) {
    if (e instanceof EditorError) return jsonError(e.message, e.status);
    const msg = e instanceof Error ? e.message : "Error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
