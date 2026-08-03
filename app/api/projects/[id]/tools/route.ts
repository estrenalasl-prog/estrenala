import { NextResponse } from "next/server";
import { jsonError } from "@/src/auth/http";
import { getContexto } from "@/src/auth/contexto";
import { getStorage } from "@/src/storage/factory";
import { projectStore } from "@/src/repositories/projects";
import { aplicarHerramientaAlProyecto, quitarHerramientaDelProyecto, estadoDeHerramientas } from "@/src/editor/tools";
import { EditorError } from "@/src/editor/errors";
import type { Herramienta, TipoHerramienta } from "@/src/editor/head-tools";

export const runtime = "nodejs";

function conError(e: unknown) {
  if (e instanceof EditorError) return jsonError(e.message, e.status);
  return jsonError("Error interno", 500);
}

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const { orgId } = await getContexto();
  try {
    const estado = await estadoDeHerramientas({ store: projectStore, storage: getStorage() }, { orgId, projectId: id });
    return NextResponse.json(estado);
  } catch (e) { return conError(e); }
}

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const { orgId } = await getContexto();
  const body = (await req.json().catch(() => ({}))) as { herramienta?: Herramienta };
  if (!body.herramienta || typeof body.herramienta !== "object") {
    return jsonError("Herramienta desconocida", 400);
  }
  try {
    const r = await aplicarHerramientaAlProyecto(
      { store: projectStore, storage: getStorage() },
      { orgId, projectId: id, herramienta: body.herramienta }
    );
    return NextResponse.json(r, { status: 201 });
  } catch (e) { return conError(e); }
}

export async function DELETE(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const { orgId } = await getContexto();
  const body = (await req.json().catch(() => ({}))) as { tipo?: TipoHerramienta };
  if (!body.tipo) return jsonError("Herramienta desconocida", 400);
  try {
    const r = await quitarHerramientaDelProyecto(
      { store: projectStore, storage: getStorage() },
      { orgId, projectId: id, tipo: body.tipo }
    );
    return NextResponse.json(r);
  } catch (e) { return conError(e); }
}
