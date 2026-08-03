import { NextResponse } from "next/server";
import { jsonError } from "@/src/auth/http";
import { autenticar, normalizarEmail } from "@/src/auth/cuentas";
import { permitirIntento, ipDe } from "@/src/auth/rate-limit";
import { accountStore } from "@/src/repositories/accounts";
import { iniciarSesion } from "@/src/auth/cookie-http";
import { EditorError } from "@/src/editor/errors";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const secret = process.env.SESSION_SECRET;
  if (!secret) return NextResponse.json({ error: "Sesión no configurada (SESSION_SECRET)" }, { status: 500 });

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  if (!permitirIntento(`login|${ipDe(req)}|${normalizarEmail(body.email)}`)) {
    return jsonError("Demasiados intentos, espera un momento", 429);
  }

  try {
    const { userId } = await autenticar(accountStore, body);
    const res = NextResponse.json({ ok: true });
    await iniciarSesion(res, secret, userId);
    return res;
  } catch (e) {
    if (e instanceof EditorError) return jsonError(e.message, e.status);
    return jsonError("No se pudo iniciar sesión", 500);
  }
}
