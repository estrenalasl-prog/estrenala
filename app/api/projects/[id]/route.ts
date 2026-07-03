import { NextResponse } from "next/server";
import { getDevContext } from "@/src/auth/dev-stub";
import { getStorage } from "@/src/storage/factory";
import { projectStore } from "@/src/repositories/projects";
import { listPages, setEntryPath } from "@/src/projects/entry";
import { cambiarSubdominio } from "@/src/publish/publish-site";
import { PublishError } from "@/src/publish/errors";

export const runtime = "nodejs";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const { orgId } = await getDevContext();
  const project = await projectStore.getProject(orgId, id);
  if (!project) return NextResponse.json({ error: "Proyecto no encontrado" }, { status: 404 });
  const pages = await listPages({ store: projectStore, storage: getStorage() }, { orgId, projectId: id });
  return NextResponse.json({ entryPath: project.entryPath, pages });
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const { orgId } = await getDevContext();
  const project = await projectStore.getProject(orgId, id);
  if (!project) return NextResponse.json({ error: "Proyecto no encontrado" }, { status: 404 });
  const body = (await req.json()) as { entryPath?: string; subdominio?: string };
  if (typeof body.subdominio === "string") {
    try {
      const r = await cambiarSubdominio({ store: projectStore }, { orgId, projectId: id, subdominio: body.subdominio });
      return NextResponse.json(r);
    } catch (e) {
      if (e instanceof PublishError) return NextResponse.json({ error: e.message }, { status: e.status });
      return NextResponse.json({ error: e instanceof Error ? e.message : "Error interno" }, { status: 500 });
    }
  }
  if (!body.entryPath) return NextResponse.json({ error: "Falta entryPath" }, { status: 400 });
  try {
    await setEntryPath({ store: projectStore, storage: getStorage() }, { orgId, projectId: id, entryPath: body.entryPath });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Error" }, { status: 400 });
  }
}
