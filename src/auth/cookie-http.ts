import { NextResponse } from "next/server";
import { firmarSesion, SESSION_COOKIE, SESSION_DURACION_MS } from "./session-cookie";

// Emite la cookie de sesión firmada (v2) para el usuario. Sin atributo Domain
// (host-only): no se filtra a los subdominios de sitios ni a dominios de clientes.
export async function iniciarSesion(res: NextResponse, secret: string, userId: string): Promise<void> {
  res.cookies.set(SESSION_COOKIE, await firmarSesion(secret, userId, Date.now() + SESSION_DURACION_MS), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: Math.floor(SESSION_DURACION_MS / 1000),
  });
}
