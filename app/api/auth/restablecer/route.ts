import { NextResponse } from "next/server";
import { permitirIntento, ipDe } from "@/src/auth/rate-limit";
import { accountStore } from "@/src/repositories/accounts";
import { aplicarReset } from "@/src/auth/verificacion";
import { hashPassword } from "@/src/auth/password";
import { EditorError } from "@/src/editor/errors";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  if (!permitirIntento(`restablecer|${ipDe(req)}`)) {
    return NextResponse.json({ error: "Demasiados intentos, espera un momento" }, { status: 429 });
  }
  const token = typeof body.token === "string" ? body.token : "";
  const password = typeof body.password === "string" ? body.password : "";
  try {
    await aplicarReset(accountStore, token, password, hashPassword);
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof EditorError) return NextResponse.json({ error: e.message }, { status: e.status });
    return NextResponse.json({ error: "No se pudo cambiar la contraseña" }, { status: 500 });
  }
}
