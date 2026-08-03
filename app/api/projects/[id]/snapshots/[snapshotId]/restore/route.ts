import { NextResponse } from "next/server";
import { jsonError } from "@/src/auth/http";
import { getContexto } from "@/src/auth/contexto";
import { projectStore } from "@/src/repositories/projects";
import { restoreSnapshot } from "@/src/editor/restore";
import { EditorError } from "@/src/editor/errors";

export const runtime = "nodejs";

export async function POST(_req: Request, ctx: { params: Promise<{ id: string; snapshotId: string }> }) {
  const { id, snapshotId } = await ctx.params;
  const { orgId } = await getContexto();
  try {
    await restoreSnapshot({ store: projectStore }, { orgId, projectId: id, snapshotId });
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof EditorError) return jsonError(e.message, e.status);
    return NextResponse.json({ error: e instanceof Error ? e.message : "Error" }, { status: 500 });
  }
}
