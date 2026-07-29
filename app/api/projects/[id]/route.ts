import { NextResponse } from "next/server";
import { getContexto } from "@/src/auth/contexto";
import { getStorage } from "@/src/storage/factory";
import { projectStore } from "@/src/repositories/projects";
import { listPages, setEntryPath } from "@/src/projects/entry";
import { cambiarSubdominio, conectarDominio, quitarDominio, MSG_DOMINIO_SIN_VERIFICAR } from "@/src/publish/publish-site";
import { getVerificarDominio } from "@/src/publish/verificar-factory";
import { registroTxtEsperado } from "@/src/publish/verificar-dominio";
import { normalizarDominio } from "@/src/publish/domain";
import { diaDe, LIMITE_DIARIO } from "@/src/publish/cupo-direcciones";
import { getDeploy } from "@/src/publish/deploy-factory";
import { PublishError } from "@/src/publish/errors";
import { esOwner, MSG_SOLO_OWNER } from "@/src/auth/roles";
import { eliminarProyecto } from "@/src/projects/eliminar";
import { EditorError } from "@/src/editor/errors";
import { accountStore } from "@/src/repositories/accounts";
import { exigirCapacidad } from "@/src/planes/planes";

export const runtime = "nodejs";

// Borrar la web entera (historial, blog y archivos). Solo el propietario.
export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const { orgId, rol } = await getContexto();
  if (!esOwner(rol)) return NextResponse.json({ error: MSG_SOLO_OWNER }, { status: 403 });
  try {
    await eliminarProyecto({ store: projectStore, storage: getStorage() }, { orgId, projectId: id });
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof EditorError) return NextResponse.json({ error: e.message }, { status: e.status });
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

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
  const body = (await req.json()) as {
    entryPath?: string; subdominio?: string; dominio?: string | null; noIndexar?: boolean;
  };
  // La dirección (subdominio/dominio) es del propietario; la página de inicio
  // (entryPath) es trabajo de edición y lo puede tocar el editor.
  const cambiaDireccion = typeof body.subdominio === "string" || typeof body.dominio === "string" || body.dominio === null;
  if (cambiaDireccion && !esOwner(rol)) return NextResponse.json({ error: MSG_SOLO_OWNER }, { status: 403 });

  // Salir o no en Google es una decisión de dueño, como despublicar. Surte efecto
  // al momento: se aplica al servir, no al publicar (no hay que republicar).
  if (typeof body.noIndexar === "boolean") {
    if (!esOwner(rol)) return NextResponse.json({ error: MSG_SOLO_OWNER }, { status: 403 });
    await projectStore.setNoIndexar(orgId, id, body.noIndexar);
    return NextResponse.json({ noIndexar: body.noIndexar });
  }
  // Cada dirección nueva pide un certificado a Let's Encrypt, y ese cupo es
  // compartido por TODOS los clientes: de ahí el tope diario por espacio.
  const cupo = () => accountStore.registrarCambioDireccion(orgId, diaDe(), LIMITE_DIARIO);

  if (typeof body.dominio === "string" || body.dominio === null) {
    const platformHost = process.env.PLATFORM_HOST ?? "localhost:3000";
    const sitesBaseDomain = process.env.SITES_BASE_DOMAIN ?? platformHost;
    try {
      if (body.dominio === null) {
        await quitarDominio({ store: projectStore, deploy: getDeploy() }, { orgId, projectId: id });
        return NextResponse.json({ dominio: null });
      }
      // Conectar dominio propio es la palanca de los planes de pago (desconectarlo
      // se permite siempre, para no atrapar a quien baje de plan).
      exigirCapacidad(await accountStore.getPlan(orgId), "dominioPropio");
      const r = await conectarDominio(
        { store: projectStore, deploy: getDeploy(), verificar: getVerificarDominio(), cupo },
        { orgId, projectId: id, dominio: body.dominio, platformHost, sitesBaseDomain }
      );
      return NextResponse.json(r);
    } catch (e) {
      if (e instanceof PublishError) {
        // Si lo que falla es la comprobación de propiedad, se le devuelve además
        // el TXT de respaldo: es la salida para quien tenga el dominio detrás de
        // un proxy, donde el registro A nunca resolverá a nuestra IP.
        const extra = e.message === MSG_DOMINIO_SIN_VERIFICAR
          ? { txt: registroTxtEsperado(normalizarDominio(body.dominio as string), process.env.SECRETS_KEY ?? "") }
          : {};
        return NextResponse.json({ error: e.message, ...extra }, { status: e.status });
      }
      if (e instanceof EditorError) return NextResponse.json({ error: e.message }, { status: e.status });
      return NextResponse.json({ error: "Error interno" }, { status: 500 });
    }
  }
  if (typeof body.subdominio === "string") {
    try {
      const r = await cambiarSubdominio(
        { store: projectStore, deploy: getDeploy(), cupo },
        { orgId, projectId: id, subdominio: body.subdominio }
      );
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
