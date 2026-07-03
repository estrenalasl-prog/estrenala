import { NextResponse, type NextRequest } from "next/server";
import { parseHost } from "@/src/publish/host";

// Hosts que no son la plataforma (subdominios de proyecto o dominios propios) se
// reescriben a la ruta interna /sites/<host>/<path>. En un host de proyecto TODO se
// sirve desde el snapshot publicado (el panel y las APIs no son alcanzables ahí).
export function middleware(req: NextRequest) {
  const host = (req.headers.get("host") ?? "").toLowerCase();
  const plat = (process.env.PLATFORM_HOST ?? "localhost:3000").toLowerCase();
  if (parseHost(host, plat).tipo === "plataforma") return NextResponse.next();
  const url = req.nextUrl.clone();
  url.pathname = `/sites/${encodeURIComponent(host)}${req.nextUrl.pathname}`;
  return NextResponse.rewrite(url);
}

export const config = {
  matcher: ["/((?!_next/|favicon\\.ico).*)"],
};
