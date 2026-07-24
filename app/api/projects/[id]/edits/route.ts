import { NextResponse } from "next/server";
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
  let body: { ops?: EditOp[] };
  try {
    body = (await req.json()) as { ops?: EditOp[] };
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }
  if (!Array.isArray(body.ops)) {
    return NextResponse.json({ error: "Faltan ops" }, { status: 400 });
  }
  try {
    const { snapshotId } = await saveEdits(
      { store: projectStore, storage: getStorage() },
      { orgId, projectId: id, ops: body.ops }
    );
    return NextResponse.json({ snapshotId }, { status: 201 });
  } catch (e) {
    if (e instanceof EditorError) return NextResponse.json({ error: e.message }, { status: e.status });
    const msg = e instanceof Error ? e.message : "Error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
