import { NextResponse, type NextRequest } from "next/server";
import { parseHost } from "@/src/publish/host";

// Hosts que no son la plataforma (subdominios de proyecto o dominios propios) se
// reescriben a la ruta interna /sites/<host>/<path>. La raíz del dominio madre
// redirige al panel. En un host de proyecto TODO se sirve desde el snapshot
// publicado (el panel y las APIs no son alcanzables ahí).
export function middleware(req: NextRequest) {
  const host = (req.headers.get("host") ?? "").toLowerCase();
  const plat = (process.env.PLATFORM_HOST ?? "localhost:3000").toLowerCase();
  const base = (process.env.SITES_BASE_DOMAIN ?? plat).toLowerCase();
  const info = parseHost(host, plat, base);
  if (info.tipo === "plataforma") return NextResponse.next();
  if (info.tipo === "raiz") {
    return NextResponse.redirect(`https://${plat}${req.nextUrl.pathname}`, 307);
  }
  const url = req.nextUrl.clone();
  url.pathname = `/sites/${encodeURIComponent(host)}${req.nextUrl.pathname}`;
  return NextResponse.rewrite(url);
}

export const config = {
  matcher: ["/((?!_next/|favicon\\.ico).*)"],
};
