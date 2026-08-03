import { NextResponse } from "next/server";
import { jsonError } from "@/src/auth/http";
import { getContexto } from "@/src/auth/contexto";
import { getStorage } from "@/src/storage/factory";
import { projectStore } from "@/src/repositories/projects";
import { proponerEdiciones } from "@/src/asistente/proponer";
import { EditorError } from "@/src/editor/errors";
import { OpenRouterError } from "@/src/ia/claude";

export const runtime = "nodejs";

export const MSG_SIN_SALDO_ASISTENTE = "Tu clave de OpenRouter no tiene saldo suficiente.";
export const MSG_PROVEEDOR_IA = "El proveedor de IA devolvió un error. Inténtalo de nuevo.";

function conError(e: unknown) {
  if (e instanceof EditorError) return jsonError(e.message, e.status);
  if (e instanceof OpenRouterError) {
    // El código del proveedor se cae del texto y se queda en el status HTTP: a
    // quien lee esto no le sirve de nada un «(429)», y meterlo dentro obligaba a
    // que la frase fuera una plantilla en cinco idiomas para un dato que no
    // cambia lo que hay que hacer.
    return jsonError(
      e.status === 402 ? MSG_SIN_SALDO_ASISTENTE : MSG_PROVEEDOR_IA,
      502
    );
  }
  // "Falta la clave de OpenRouter: añádela en Configuración" (lanzado por claude.ts)
  const texto = e instanceof Error ? e.message : "";
  if (/clave de OpenRouter/i.test(texto)) return jsonError(texto, 400);
  return jsonError("Error interno", 500);
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
