import { NextResponse } from "next/server";
import { getContexto } from "@/src/auth/contexto";
import { getStorage } from "@/src/storage/factory";
import { projectStore } from "@/src/repositories/projects";
import { listPages, setEntryPath } from "@/src/projects/entry";
import { cambiarSubdominio, conectarDominio, quitarDominio } from "@/src/publish/publish-site";
import { getDeploy } from "@/src/publish/deploy-factory";
import { PublishError } from "@/src/publish/errors";
import { esOwner, MSG_SOLO_OWNER } from "@/src/auth/roles";

export const runtime = "nodejs";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const { orgId } = await getContexto();
  const project = await projectStore.getProject(orgId, id);
  if (!project) return NextResponse.json({ error: "Proyecto no encontrado" }, { status: 404 });
  const pages = await listPages({ store: projectStore, storage: getStorage() }, { orgId, projectId: id });
  return NextResponse.json({ entryPath: project.entryPath, pages });
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const { orgId, rol } = await getContexto();
  const project = await projectStore.getProject(orgId, id);
  if (!project) return NextResponse.json({ error: "Proyecto no encontrado" }, { status: 404 });
  const body = (await req.json()) as { entryPath?: string; subdominio?: string; dominio?: string | null };
  // La dirección (subdominio/dominio) es del propietario; la página de inicio
  // (entryPath) es trabajo de edición y lo puede tocar el editor.
  const cambiaDireccion = typeof body.subdominio === "string" || typeof body.dominio === "string" || body.dominio === null;
  if (cambiaDireccion && !esOwner(rol)) return NextResponse.json({ error: MSG_SOLO_OWNER }, { status: 403 });
  if (typeof body.dominio === "string" || body.dominio === null) {
    const platformHost = process.env.PLATFORM_HOST ?? "localhost:3000";
    const sitesBaseDomain = process.env.SITES_BASE_DOMAIN ?? platformHost;
    try {
      if (body.dominio === null) {
        await quitarDominio({ store: projectStore, deploy: getDeploy() }, { orgId, projectId: id });
        return NextResponse.json({ dominio: null });
      }
      const r = await conectarDominio(
        { store: projectStore, deploy: getDeploy() },
        { orgId, projectId: id, dominio: body.dominio, platformHost, sitesBaseDomain }
      );
      return NextResponse.json(r);
    } catch (e) {
      if (e instanceof PublishError) return NextResponse.json({ error: e.message }, { status: e.status });
      return NextResponse.json({ error: "Error interno" }, { status: 500 });
    }
  }
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
