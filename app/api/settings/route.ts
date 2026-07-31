import { NextResponse } from "next/server";
import { getContexto } from "@/src/auth/contexto";
import { exigirOwner } from "@/src/auth/roles";
import { orgSettingsStore, type OrgSettings } from "@/src/repositories/org-settings";
import { EditorError } from "@/src/editor/errors";

export const runtime = "nodejs";

function conError(e: unknown) {
  if (e instanceof EditorError) return NextResponse.json({ error: e.message }, { status: e.status });
  return NextResponse.json({ error: "Error interno" }, { status: 500 });
}

// La clave completa NUNCA sale por la API: solo si está puesta y sus últimos 4.
//
// `origen` ya solo puede ser "ui" o null. Existió un tercer valor, "env", que
// significaba «este espacio está usando la clave de la plataforma»: se quitó
// porque ese respaldo hacía que la IA de los clientes la pagáramos nosotros.
function estadoDe(claveUi: string) {
  return {
    origen: claveUi ? "ui" : null,
    sufijo: claveUi ? claveUi.slice(-4) : "",
  };
}

export async function GET() {
  const { orgId } = await getContexto();
  try {
    const s = await orgSettingsStore.getSettings(orgId);
    return NextResponse.json({
      openrouter: estadoDe(s?.openrouterKey ?? ""),
      serpapi: estadoDe(s?.serpapiKey ?? ""),
      modeloIa: s?.modeloIa ?? "", // no es secreto: el nombre del modelo se muestra tal cual
    });
  } catch (e) { return conError(e); }
}

export async function PUT(req: Request) {
  const { orgId, rol } = await getContexto();
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  try {
    exigirOwner(rol); // las claves del espacio solo las toca el propietario
    const patch: Partial<OrgSettings> = {};
    for (const [campo, valor] of [["openrouterKey", body.openrouterKey], ["serpapiKey", body.serpapiKey]] as const) {
      if (typeof valor !== "string") continue; // ausente = no tocar
      const clave = valor.trim();
      if (clave.length > 200) throw new EditorError("La clave es demasiado larga (máx. 200 caracteres)", 400);
      patch[campo] = clave; // "" la borra → ese espacio se queda sin IA hasta que ponga otra
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
