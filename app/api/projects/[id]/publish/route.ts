import { NextResponse } from "next/server";
import { getContexto } from "@/src/auth/contexto";
import { projectStore } from "@/src/repositories/projects";
import { accountStore } from "@/src/repositories/accounts";
import { exigirEmailVerificado } from "@/src/auth/verificacion";
import { publishSite, unpublishSite } from "@/src/publish/publish-site";
import { getDeploy } from "@/src/publish/deploy-factory";
import { PublishError } from "@/src/publish/errors";
import { EditorError } from "@/src/editor/errors";

export const runtime = "nodejs";

export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const { orgId, userId } = await getContexto();
  try {
    await exigirEmailVerificado(accountStore, userId, "publicar");
    const r = await publishSite({ store: projectStore, deploy: getDeploy() }, { orgId, projectId: id });
    return NextResponse.json(r);
  } catch (e) {
    if (e instanceof PublishError) return NextResponse.json({ error: e.message }, { status: e.status });
    if (e instanceof EditorError) return NextResponse.json({ error: e.message }, { status: e.status });
    return NextResponse.json({ error: e instanceof Error ? e.message : "Error interno" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const { orgId } = await getContexto();
  try {
    await unpublishSite({ store: projectStore, deploy: getDeploy() }, { orgId, projectId: id });
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof PublishError) return NextResponse.json({ error: e.message }, { status: e.status });
    return NextResponse.json({ error: e instanceof Error ? e.message : "Error interno" }, { status: 500 });
  }
}
