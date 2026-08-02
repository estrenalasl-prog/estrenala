import { NextResponse } from "next/server";
import { normalizarEmail } from "@/src/auth/cuentas";
import { permitirIntento, ipDe } from "@/src/auth/rate-limit";
import { accountStore } from "@/src/repositories/accounts";
import { solicitarReset } from "@/src/auth/verificacion";
import { baseApp } from "@/src/auth/url";
import { idiomaActual } from "@/src/i18n/servidor";
import { textosCuenta } from "@/src/i18n/cuenta";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const email = normalizarEmail(body.email);
  const idioma = await idiomaActual();
  // Respuesta SIEMPRE neutra: no revela si el correo tiene cuenta
  // (anti-enumeración). Se calcula antes de los dos returns para que la del
  // límite de intentos y la normal sean EXACTAMENTE la misma cadena: si una se
  // tradujera y la otra no, la diferencia delataría cuál es cuál.
  const neutro = textosCuenta(idioma).recuperar.mensaje;
  // Aunque limitemos, la respuesta no cambia (sigue siendo neutra).
  if (!permitirIntento(`recuperar|${ipDe(req)}|${email}`)) {
    return NextResponse.json({ mensaje: neutro });
  }
  try {
    await solicitarReset(accountStore, email, baseApp(req), idioma);
  } catch (e) {
    console.error("recuperar: fallo al enviar el correo", e instanceof Error ? e.message : e);
  }
  return NextResponse.json({ mensaje: neutro });
}
