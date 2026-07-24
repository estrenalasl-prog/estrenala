import { NextResponse } from "next/server";
import { getContexto } from "@/src/auth/contexto";
import { orgSettingsStore, type OrgSettings } from "@/src/repositories/org-settings";
import { EditorError } from "@/src/editor/errors";

export const runtime = "nodejs";

function conError(e: unknown) {
  if (e instanceof EditorError) return NextResponse.json({ error: e.message }, { status: e.status });
  return NextResponse.json({ error: "Error interno" }, { status: 500 });
}

// La clave completa NUNCA sale por la API: solo de dónde viene y sus últimos 4.
function estadoDe(claveUi: string, claveEnv: string | undefined) {
  const activa = claveUi || claveEnv || "";
  return {
    origen: claveUi ? "ui" : claveEnv ? "env" : null,
    sufijo: activa ? activa.slice(-4) : "",
  };
}

export async function GET() {
  const { orgId } = await getContexto();
  try {
    const s = await orgSettingsStore.getSettings(orgId);
    return NextResponse.json({
      openrouter: estadoDe(s?.openrouterKey ?? "", process.env.OPENROUTER_API_KEY),
      serpapi: estadoDe(s?.serpapiKey ?? "", process.env.SERPAPI_KEY),
      modeloIa: s?.modeloIa ?? "", // no es secreto: el nombre del modelo se muestra tal cual
    });
  } catch (e) { return conError(e); }
}

export async function PUT(req: Request) {
  const { orgId } = await getContexto();
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  try {
    const patch: Partial<OrgSettings> = {};
    for (const [campo, valor] of [["openrouterKey", body.openrouterKey], ["serpapiKey", body.serpapiKey]] as const) {
      if (typeof valor !== "string") continue; // ausente = no tocar
      const clave = valor.trim();
      if (clave.length > 200) throw new EditorError("La clave es demasiado larga (máx. 200 caracteres)", 400);
      patch[campo] = clave; // "" limpia → vuelve al respaldo del .env.local
    }
    if (typeof body.modeloIa === "string") {
      const modelo = body.modeloIa.trim();
      if (modelo.length > 100) throw new EditorError("El nombre del modelo es demasiado largo (máx. 100 caracteres)", 400);
      patch.modeloIa = modelo; // "" = default de la plataforma
    }
    await orgSettingsStore.setSettings(orgId, patch);
    return NextResponse.json({ ok: true });
  } catch (e) { return conError(e); }
}
