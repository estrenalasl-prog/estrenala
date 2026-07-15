import { NextResponse } from "next/server";
import { probarConexionModelo } from "@/src/ia/claude";
import { probarConexionSerpApi } from "@/src/blog/radar/serpapi";
import { EditorError } from "@/src/editor/errors";

export const runtime = "nodejs";

// Prueba la conexión del servicio con la clave activa (UI o .env) sin gastar
// créditos. El fallo del proveedor no es un error HTTP: va como { ok: false }.
export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const cual = typeof body.cual === "string" ? body.cual : "";
  if (cual !== "openrouter" && cual !== "serpapi") {
    return NextResponse.json({ error: "Servicio desconocido" }, { status: 400 });
  }
  try {
    const detalle = cual === "openrouter" ? await probarConexionModelo() : await probarConexionSerpApi();
    return NextResponse.json({ ok: true, detalle });
  } catch (e) {
    if (e instanceof EditorError) return NextResponse.json({ error: e.message }, { status: e.status });
    const msg = e instanceof Error ? e.message : "Error desconocido";
    return NextResponse.json({ ok: false, error: msg });
  }
}
