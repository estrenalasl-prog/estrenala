import { NextResponse } from "next/server";
import { getContexto } from "@/src/auth/contexto";
import { getStorage } from "@/src/storage/factory";
import { projectStore } from "@/src/repositories/projects";
import { proponerEdiciones } from "@/src/asistente/proponer";
import { EditorError } from "@/src/editor/errors";
import { OpenRouterError } from "@/src/ia/claude";

export const runtime = "nodejs";

function conError(e: unknown) {
  if (e instanceof EditorError) return NextResponse.json({ error: e.message }, { status: e.status });
  if (e instanceof OpenRouterError) {
    const msg = e.status === 402
      ? "Tu clave de OpenRouter no tiene saldo suficiente."
      : `El proveedor de IA devolvió un error (${e.status}). Inténtalo de nuevo.`;
    return NextResponse.json({ error: msg }, { status: 502 });
  }
  // "Falta la clave de OpenRouter: añádela en Configuración" (lanzado por claude.ts)
  const texto = e instanceof Error ? e.message : "";
  if (/clave de OpenRouter/i.test(texto)) return NextResponse.json({ error: texto }, { status: 400 });
  return NextResponse.json({ error: "Error interno" }, { status: 500 });
}

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const { orgId } = await getContexto();
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const page = typeof body.page === "string" ? body.page : "";
  const instruccion = typeof body.instruccion === "string" ? body.instruccion : "";
  try {
    const { ops, resumen, page: pageUsada } = await proponerEdiciones(
      { store: projectStore, storage: getStorage() },
      { orgId, projectId: id, page, instruccion }
    );
    return NextResponse.json({ ops, resumen, page: pageUsada });
  } catch (e) {
    return conError(e);
  }
}
