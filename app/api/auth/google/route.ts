import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { googleConfigurado, urlAutorizacion } from "@/src/auth/google";
import { baseApp } from "@/src/auth/url";

export const runtime = "nodejs";

// Arranca el flujo OAuth: fija un `state` aleatorio en cookie (anti-CSRF) y
// manda al usuario a Google. Si no hay credenciales, vuelve al login.
export async function GET(req: Request) {
  const base = baseApp(req);
  if (!googleConfigurado()) return NextResponse.redirect(`${base}/login?error=google`, 302);

  const state = randomBytes(16).toString("hex");
  const url = urlAutorizacion({
    clientId: process.env.GOOGLE_CLIENT_ID!,
    redirectUri: `${base}/api/auth/google/callback`,
    state,
  });
  const res = NextResponse.redirect(url, 302);
  res.cookies.set("g_state", state, {
    httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production",
    path: "/", maxAge: 600,
  });
  return res;
}
