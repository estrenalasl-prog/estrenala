import { NextResponse } from "next/server";
import { getDevContext } from "@/src/auth/dev-stub";
import { projectStore } from "@/src/repositories/projects";

export const runtime = "nodejs";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const { orgId } = await getDevContext();
  const project = await projectStore.getProject(orgId, id);
  if (!project) return NextResponse.json({ error: "Proyecto no encontrado" }, { status: 404 });
  const snapshots = await projectStore.listSnapshots(orgId, id);
  return NextResponse.json({ snapshots });
}
