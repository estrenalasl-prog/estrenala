import { NextResponse } from "next/server";
import { getContexto } from "@/src/auth/contexto";
import { entrarOrg } from "@/src/auth/org-context";
import { probarConexionModelo } from "@/src/ia/claude";
import { probarConexionSerpApi } from "@/src/blog/radar/serpapi";
import { EditorError } from "@/src/editor/errors";

export const runtime = "nodejs";

// Prueba la conexión del servicio con la clave DE ESTE ESPACIO, sin gastar
// créditos. El fallo del proveedor no es un error HTTP: va como { ok: false }.
//
// El `entrarOrg` es imprescindible: las claves se resuelven por contexto
// ambiental (org-context) y sin él `claveOpenRouter()` devuelve "". Faltaba, y
// mientras existió el respaldo al .env el fallo estaba tapado de la peor forma
// posible: esto probaba la clave DE LA PLATAFORMA, así que decía «válida»
// aunque el usuario hubiera pegado una clave inventada. Justo lo contrario de
// lo que este botón promete.
export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const cual = typeof body.cual === "string" ? body.cual : "";
  if (cual !== "openrouter" && cual !== "serpapi") {
    return NextResponse.json({ error: "Servicio desconocido" }, { status: 400 });
  }
  try {
    const { orgId } = await getContexto();
    entrarOrg(orgId);
    const detalle = cual === "openrouter" ? await probarConexionModelo() : await probarConexionSerpApi();
    return NextResponse.json({ ok: true, detalle });
  } catch (e) {
    if (e instanceof EditorError) return NextResponse.json({ error: e.message }, { status: e.status });
    const msg = e instanceof Error ? e.message : "Error desconocido";
    return NextResponse.json({ ok: false, error: msg });
  }
}
