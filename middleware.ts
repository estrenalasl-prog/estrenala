import { NextResponse, type NextRequest } from "next/server";
import { parseHost } from "@/src/publish/host";
import { verificarSesion, SESSION_COOKIE } from "@/src/auth/session-cookie";

// Rutas del panel accesibles sin sesión.
const RUTAS_PUBLICAS = ["/login", "/api/login", "/api/health"];

// 1) Hosts que no son la plataforma → se sirven como sitio publicado (/sites/<host>).
// 2) La raíz del dominio madre → redirect al panel.
// 3) El panel exige la cookie de sesión firmada (candado de contraseña única).
export async function middleware(req: NextRequest) {
  // Healthcheck de infraestructura: responde igual con cualquier Host (Dokploy/Traefik).
  if (req.nextUrl.pathname === "/api/health") return NextResponse.next();

  const host = (req.headers.get("host") ?? "").toLowerCase();
  const plat = (process.env.PLATFORM_HOST ?? "localhost:3000").toLowerCase();
  const base = (process.env.SITES_BASE_DOMAIN ?? plat).toLowerCase();
  const info = parseHost(host, plat, base);

  if (info.tipo === "raiz") {
    return NextResponse.redirect(`https://${plat}${req.nextUrl.pathname}`, 307);
  }
  if (info.tipo !== "plataforma") {
    const url = req.nextUrl.clone();
    url.pathname = `/sites/${encodeURIComponent(host)}${req.nextUrl.pathname}`;
    return NextResponse.rewrite(url);
  }

  const { pathname } = req.nextUrl;
  if (RUTAS_PUBLICAS.some((r) => pathname === r || pathname.startsWith(r + "/"))) {
    return NextResponse.next();
  }
  // El preview del panel vive en un iframe con sandbox (origen opaco): el navegador
  // NO adjunta la cookie a sus subrecursos (CSS, imágenes, wc-editor.js). Se permite
  // solo LECTURA (GET) de esos recursos — el UUID v4 del proyecto es inadivinable y
  // actúa de capacidad. La escritura (edits, publish, subida de assets…) y el resto
  // del panel siguen tras el candado.
  if (
    req.method === "GET" &&
    (/^\/api\/projects\/[0-9a-f-]{36}\/(preview(\/|$)|assets\/)/.test(pathname) ||
      pathname === "/wc-editor.js")
  ) {
    return NextResponse.next();
  }
  const secret = process.env.SESSION_SECRET;
  const cookie = req.cookies.get(SESSION_COOKIE)?.value;
  const valido = !!secret && !!cookie && (await verificarSesion(secret, cookie, Date.now()));
  if (valido) return NextResponse.next();

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.search = "";
  return NextResponse.redirect(url, 307);
}

export const config = {
  matcher: ["/((?!_next/|favicon\\.ico).*)"],
};
