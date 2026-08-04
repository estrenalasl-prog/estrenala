import { NextResponse } from "next/server";
import { jsonError } from "@/src/auth/http";
import { getContexto } from "@/src/auth/contexto";
import { projectStore } from "@/src/repositories/projects";
import { accountStore } from "@/src/repositories/accounts";
import { exigirEmailVerificado } from "@/src/auth/verificacion";
import { exigirOwner } from "@/src/auth/roles";
import { publishSite, unpublishSite } from "@/src/publish/publish-site";
import { olvidarSitio } from "@/src/publish/cache-servir";
import { getDeploy } from "@/src/publish/deploy-factory";
import { PublishError } from "@/src/publish/errors";
import { EditorError } from "@/src/editor/errors";

export const runtime = "nodejs";

export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const { orgId, userId } = await getContexto();
  try {
    await exigirEmailVerificado(accountStore, userId, "publicar");
    const r = await publishSite({ store: projectStore, deploy: getDeploy(), alCambiar: olvidarSitio }, { orgId, projectId: id });
    return NextResponse.json(r);
  } catch (e) {
    if (e instanceof PublishError) return jsonError(e.message, e.status);
    if (e instanceof EditorError) return jsonError(e.message, e.status);
    return NextResponse.json({ error: e instanceof Error ? e.message : "Error interno" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const { orgId, rol } = await getContexto();
  try {
    exigirOwner(rol); // despublicar es destructivo: solo el propietario
    await unpublishSite({ store: projectStore, deploy: getDeploy(), alCambiar: olvidarSitio }, { orgId, projectId: id });
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof PublishError) return jsonError(e.message, e.status);
    if (e instanceof EditorError) return jsonError(e.message, e.status);
    return NextResponse.json({ error: e instanceof Error ? e.message : "Error interno" }, { status: 500 });
  }
}
