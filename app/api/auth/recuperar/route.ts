import { NextResponse } from "next/server";
import { normalizarEmail } from "@/src/auth/cuentas";
import { permitirIntento, ipDe } from "@/src/auth/rate-limit";
import { accountStore } from "@/src/repositories/accounts";
import { solicitarReset } from "@/src/auth/verificacion";
import { baseApp } from "@/src/auth/url";

export const runtime = "nodejs";

// Respuesta SIEMPRE neutra: no revela si el correo tiene cuenta (anti-enumeración).
const NEUTRO = "Si ese correo tiene cuenta, te hemos enviado un enlace";

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const email = normalizarEmail(body.email);
  // Aunque limitemos, la respuesta no cambia (sigue siendo neutra).
  if (!permitirIntento(`recuperar|${ipDe(req)}|${email}`)) {
    return NextResponse.json({ mensaje: NEUTRO });
  }
  try {
    await solicitarReset(accountStore, email, baseApp(req));
  } catch (e) {
    console.error("recuperar: fallo al enviar el correo", e instanceof Error ? e.message : e);
  }
  return NextResponse.json({ mensaje: NEUTRO });
}
