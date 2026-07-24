import { NextResponse } from "next/server";
import { accountStore } from "@/src/repositories/accounts";
import { confirmarCambioEmail } from "@/src/auth/cuenta";
import { errorJson } from "@/src/auth/http";

export const runtime = "nodejs";

// Aplica el cambio de correo con el token del enlace enviado al correo NUEVO.
// Pública: la capacidad es el token (quien controla el correo nuevo).
export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as { token?: unknown };
    await confirmarCambioEmail(accountStore, typeof body.token === "string" ? body.token : "");
    return NextResponse.json({ ok: true });
  } catch (e) {
    return errorJson(e);
  }
}
