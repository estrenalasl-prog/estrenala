import { NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/src/auth/session-cookie";

export const runtime = "nodejs";

export async function POST() {
  const res = NextResponse.json({ ok: true });
  // Mismos atributos que al emitirla (secure incluido): con el prefijo __Host-
  // el navegador rechazaría el borrado si no cuadran y la sesión no se cerraría.
  res.cookies.set(SESSION_COOKIE, "", { httpOnly: true, sameSite: "lax", secure: true, path: "/", maxAge: 0 });
  return res;
}
