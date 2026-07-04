import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { firmarSesion, SESSION_COOKIE, SESSION_DURACION_MS } from "@/src/auth/session-cookie";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const password = process.env.PANEL_PASSWORD;
  const secret = process.env.SESSION_SECRET;
  if (!password || !secret) {
    return NextResponse.json({ error: "Candado no configurado (PANEL_PASSWORD/SESSION_SECRET)" }, { status: 500 });
  }
  const body = (await req.json().catch(() => ({}))) as { password?: string };
  const intento = Buffer.from(typeof body.password === "string" ? body.password : "");
  const real = Buffer.from(password);
  const igual = intento.length === real.length && timingSafeEqual(intento, real);
  if (!igual) return NextResponse.json({ error: "Contraseña incorrecta" }, { status: 401 });

  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, await firmarSesion(secret, Date.now() + SESSION_DURACION_MS), {
    httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production",
    path: "/", maxAge: Math.floor(SESSION_DURACION_MS / 1000),
    // Sin `domain`: host-only (aislamiento de los sitios publicados).
  });
  return res;
}
