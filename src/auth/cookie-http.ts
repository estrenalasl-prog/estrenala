import { NextResponse } from "next/server";
import { firmarSesion, SESSION_COOKIE, SESSION_DURACION_MS } from "./session-cookie";
import { ORG_COOKIE } from "./contexto";

// Emite la cookie de sesión firmada (v2) para el usuario. Sin atributo Domain
// (host-only): no se filtra a los subdominios de sitios ni a dominios de clientes.
//
// `secure` va SIEMPRE, también en desarrollo, porque el prefijo `__Host-` lo
// exige y sin él el navegador tira la cookie entera. En local no estorba:
// http://localhost cuenta como origen de confianza y admite cookies `Secure`.
// (Entrar por la IP de red en vez de por localhost sí dejaría de funcionar;
// ese sería el momento de levantar el servidor de desarrollo con HTTPS.)
export async function iniciarSesion(res: NextResponse, secret: string, userId: string): Promise<void> {
  res.cookies.set(SESSION_COOKIE, await firmarSesion(secret, userId, Date.now() + SESSION_DURACION_MS), {
    httpOnly: true,
    sameSite: "lax",
    secure: true, // lo exige el prefijo __Host-
    path: "/",
    maxAge: Math.floor(SESSION_DURACION_MS / 1000),
  });
}

// Caduca la sesión y la org activa (p. ej. al borrar la cuenta).
export function cerrarSesion(res: NextResponse): void {
  for (const nombre of [SESSION_COOKIE, ORG_COOKIE]) {
    res.cookies.set(nombre, "", {
      httpOnly: true,
      sameSite: "lax",
      secure: true, // lo exige el prefijo __Host-
      path: "/",
      maxAge: 0,
    });
  }
}

// Fija la organización activa (espacio) en su cookie hermana. getContexto la
// valida siempre contra los memberships, así que ponerla no da acceso por sí sola.
export function fijarOrgActiva(res: NextResponse, orgId: string): void {
  res.cookies.set(ORG_COOKIE, orgId, {
    httpOnly: true,
    sameSite: "lax",
    secure: true, // lo exige el prefijo __Host-
    path: "/",
    maxAge: 400 * 24 * 60 * 60,
  });
}
