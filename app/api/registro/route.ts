import { NextResponse } from "next/server";
import { registrar, normalizarEmail } from "@/src/auth/cuentas";
import { permitirIntento, ipDe } from "@/src/auth/rate-limit";
import { accountStore } from "@/src/repositories/accounts";
import { iniciarSesion } from "@/src/auth/cookie-http";
import { enviarVerificacion } from "@/src/auth/verificacion";
import { baseApp } from "@/src/auth/url";
import { EditorError } from "@/src/editor/errors";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const secret = process.env.SESSION_SECRET;
  if (!secret) return NextResponse.json({ error: "Sesión no configurada (SESSION_SECRET)" }, { status: 500 });

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  if (!permitirIntento(`reg|${ipDe(req)}|${normalizarEmail(body.email)}`)) {
    return NextResponse.json({ error: "Demasiados intentos, espera un momento" }, { status: 429 });
  }

  try {
    const { userId } = await registrar(accountStore, body);
    // Correo de confirmación. Si el envío falla (Resend caído), NO se tumba el
    // alta: la cuenta ya existe y el usuario puede pedir el correo de nuevo.
    try {
      await enviarVerificacion(accountStore, {
        userId, email: normalizarEmail(body.email),
        nombre: String(body.nombre ?? "").trim(), base: baseApp(req),
      });
    } catch (e) {
      console.error("registro: fallo al enviar la verificación", e instanceof Error ? e.message : e);
    }
    const res = NextResponse.json({ ok: true }, { status: 201 });
    await iniciarSesion(res, secret, userId);
    return res;
  } catch (e) {
    if (e instanceof EditorError) return NextResponse.json({ error: e.message }, { status: e.status });
    return NextResponse.json({ error: "No se pudo crear la cuenta" }, { status: 500 });
  }
}
