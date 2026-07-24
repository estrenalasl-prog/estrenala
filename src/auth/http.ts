import { NextResponse } from "next/server";
import { EditorError } from "@/src/editor/errors";

// Traduce errores de las rutas de cuentas/equipo a JSON. EditorError conserva su
// código y mensaje (byte-exacto); cualquier otro se oculta como 500 genérico.
export function errorJson(e: unknown) {
  if (e instanceof EditorError) return NextResponse.json({ error: e.message }, { status: e.status });
  return NextResponse.json({ error: "Error interno" }, { status: 500 });
}
