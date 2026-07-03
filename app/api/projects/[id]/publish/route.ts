import { NextResponse } from "next/server";
import { getDevContext } from "@/src/auth/dev-stub";
import { projectStore } from "@/src/repositories/projects";
import { publishSite, unpublishSite } from "@/src/publish/publish-site";
import { selfHostedDeploy } from "@/src/publish/deploy-target";
import { PublishError } from "@/src/publish/errors";

export const runtime = "nodejs";

export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const { orgId } = await getDevContext();
  try {
    const r = await publishSite({ store: projectStore, deploy: selfHostedDeploy }, { orgId, projectId: id });
    return NextResponse.json(r);
  } catch (e) {
    if (e instanceof PublishError) return NextResponse.json({ error: e.message }, { status: e.status });
    return NextResponse.json({ error: e instanceof Error ? e.message : "Error interno" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const { orgId } = await getDevContext();
  try {
    await unpublishSite({ store: projectStore, deploy: selfHostedDeploy }, { orgId, projectId: id });
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof PublishError) return NextResponse.json({ error: e.message }, { status: e.status });
    return NextResponse.json({ error: e instanceof Error ? e.message : "Error interno" }, { status: 500 });
  }
}
