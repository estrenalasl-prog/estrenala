import { NextResponse, type NextRequest } from "next/server";
import { googleConfigurado, obtenerPerfilGoogle, resolverUsuarioGoogle } from "@/src/auth/google";
import { accountStore } from "@/src/repositories/accounts";
import { iniciarSesion } from "@/src/auth/cookie-http";
import { baseApp } from "@/src/auth/url";

export const runtime = "nodejs";

// Vuelta de Google: valida el `state` contra la cookie, canjea el code, resuelve
// (login/vincular/crear) e inicia sesión. Cualquier fallo vuelve al login sin
// dar detalles. Ruta pública (el usuario aún no tiene sesión).
export async function GET(req: NextRequest) {
  const base = baseApp(req);
  const secret = process.env.SESSION_SECRET;
  const url = new URL(req.url);
  const code = url.searchParams.get("code") ?? "";
  const state = url.searchParams.get("state") ?? "";
  const cookieState = req.cookies.get("g_state")?.value ?? "";
  const fallo = () => NextResponse.redirect(`${base}/login?error=google`, 302);

  if (!googleConfigurado() || !secret) return fallo();
  if (!code || !state || state !== cookieState) return fallo();

  try {
    const perfil = await obtenerPerfilGoogle({
      code,
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      redirectUri: `${base}/api/auth/google/callback`,
    });
    const { userId } = await resolverUsuarioGoogle(accountStore, perfil);
    const res = NextResponse.redirect(`${base}/`, 302);
    await iniciarSesion(res, secret, userId);
    res.cookies.set("g_state", "", { path: "/", maxAge: 0 });
    return res;
  } catch {
    return fallo();
  }
}
