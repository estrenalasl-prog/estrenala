import { NextResponse } from "next/server";
import { jsonError } from "@/src/auth/http";
import { getContexto } from "@/src/auth/contexto";
import { projectStore } from "@/src/repositories/projects";

export const runtime = "nodejs";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const { orgId } = await getContexto();
  const project = await projectStore.getProject(orgId, id);
  if (!project) return jsonError("Proyecto no encontrado", 404);
  const snapshots = await projectStore.listSnapshots(orgId, id);
  return NextResponse.json({ snapshots });
}
