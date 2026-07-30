import { NextResponse, type NextRequest } from "next/server";
import { parseHost } from "@/src/publish/host";
import { verificarSesion, SESSION_COOKIE } from "@/src/auth/session-cookie";
import { plataformaOculta, ROBOTS_NOINDEX, CABECERAS_SEGURIDAD, CABECERAS_SEGURIDAD_INCRUSTABLE } from "@/src/config/robots-plataforma";

// Rutas del panel accesibles sin sesión. Los cron son para disparadores
// externos (sin cookie): solo hacen lo que el tick del servidor haría igual en
// <60 s (publicar vencidos / ejecutar pilotos ya configurados por sus dueños)
// y pueden exigir CRON_SECRET — el candado real está en cada ruta.
const RUTAS_PUBLICAS = ["/login", "/api/login", "/registro", "/api/registro",
  "/verificar", "/recuperar", "/restablecer", "/api/auth/recuperar", "/api/auth/restablecer",
  "/api/auth/google", "/invitacion", "/cambiar-email", "/api/cuenta/email/confirmar",
  "/api/health", "/api/cron/publicar", "/api/cron/piloto", "/brand", "/legal",
  // Lo llama Stripe (sin cookie); su candado es la firma HMAC del cuerpo.
  "/api/stripe/webhook"];

// Archivos que Next sirve en la raíz por convención de `app/`. Los piden el
// navegador y los buscadores SIN sesión, así que van por coincidencia EXACTA
// (no por prefijo como RUTAS_PUBLICAS: no queremos abrir "/icon.png/loquesea").
// Sin esto acababan en el 307 a /login y el icono no se veía en la landing.
const ARCHIVOS_PUBLICOS = new Set(["/robots.txt", "/sitemap.xml", "/icon.png", "/apple-icon.png"]);

// 1) Hosts que no son la plataforma → se sirven como sitio publicado (/sites/<host>).
// 2) La raíz del dominio madre → redirect al panel.
// 3) El panel exige la cookie de sesión firmada (candado de contraseña única).
export async function middleware(req: NextRequest) {
  // Healthcheck de infraestructura: responde igual con cualquier Host (Dokploy/Traefik).
  if (req.nextUrl.pathname === "/api/health") return NextResponse.next();

  const host = (req.headers.get("host") ?? "").toLowerCase();
  const plat = (process.env.PLATFORM_HOST ?? "localhost:3000").toLowerCase();
  const base = (process.env.SITES_BASE_DOMAIN ?? plat).toLowerCase();

  // www de la plataforma → 301 al dominio pelado. Va ANTES de parseHost porque
  // con PLATAFORMA.com como base de sitios, "www" parecería el subdominio de un
  // cliente (está en RESERVADOS, así que nadie puede tenerlo) y acabaría en la
  // 404 pública. Con el DNS comodín *.PLATAFORMA.com esto pasa de verdad.
  if (host === `www.${plat}`) {
    return NextResponse.redirect(`https://${plat}${req.nextUrl.pathname}${req.nextUrl.search}`, 301);
  }

  const info = parseHost(host, plat, base);

  if (info.tipo === "raiz") {
    return NextResponse.redirect(`https://${plat}${req.nextUrl.pathname}`, 307);
  }
  if (info.tipo !== "plataforma") {
    const url = req.nextUrl.clone();
    url.pathname = `/sites/${encodeURIComponent(host)}${req.nextUrl.pathname}`;
    return NextResponse.rewrite(url);
  }

  // De aquí abajo ya solo pasan hosts de la plataforma: las webs publicadas se
  // han desviado arriba. Por eso este es el sitio donde poner las cabeceras de
  // seguridad y no next.config.ts, que no puede distinguir unas de otras.
  //
  // Y el candado de pre-lanzamiento: mientras PLATAFORMA_NOINDEX esté puesto,
  // toda respuesta de la plataforma sale con noindex. Las webs de clientes
  // mandan sobre su propia indexación con el interruptor de cada proyecto.
  const oculta = plataformaOculta(process.env);
  const sellar = (res: NextResponse, cabeceras = CABECERAS_SEGURIDAD) => {
    for (const [k, v] of Object.entries(cabeceras)) res.headers.set(k, v);
    if (oculta) res.headers.set("x-robots-tag", ROBOTS_NOINDEX);
    return res;
  };

  const { pathname } = req.nextUrl;

  // Al apagar la normalización automática de Next (skipTrailingSlashRedirect,
  // ver next.config.ts) la PLATAFORMA se quedaría sin ella y `/login/` pasaría a
  // ser una segunda dirección con el mismo contenido. Aquí se restaura tal cual
  // estaba: el panel no lleva barra final. Las webs de los clientes ya se han
  // desviado arriba y no llegan a esta línea — las suyas las decide resolve-site,
  // que sí distingue un índice de carpeta de una URL limpia.
  // Se construye sobre `new URL(req.url)` y no sobre `req.nextUrl.clone()`:
  // NextURL recuerda que la ruta venía con barra y la vuelve a poner al
  // serializar, con lo que la redirección apuntaría a sí misma.
  if (pathname.length > 1 && pathname.endsWith("/")) {
    const destino = new URL(req.url);
    destino.pathname = pathname.replace(/\/+$/, "") || "/";
    return sellar(NextResponse.redirect(destino, 308));
  }

  // La raíz es pública: sin sesión sirve la landing de marketing, con sesión el
  // panel (lo decide app/page.tsx). Va aparte de RUTAS_PUBLICAS a propósito:
  // meter "/" en esa lista abriría TODA la app por el startsWith.
  if (pathname === "/") return sellar(NextResponse.next());
  if (ARCHIVOS_PUBLICOS.has(pathname)) return sellar(NextResponse.next());
  if (RUTAS_PUBLICAS.some((r) => pathname === r || pathname.startsWith(r + "/"))) {
    return sellar(NextResponse.next());
  }
  // El preview del panel vive en un iframe con sandbox (origen opaco): el navegador
  // NO adjunta la cookie a sus subrecursos (CSS, imágenes, wc-editor.js). Se permite
  // solo LECTURA (GET) de esos recursos — el UUID v4 del proyecto es inadivinable y
  // actúa de capacidad. La escritura (edits, publish, subida de assets…) y el resto
  // del panel siguen tras el candado.
  // Esto es justo lo que el panel enseña DENTRO del iframe, así que va con
  // `frame-ancestors 'self'`: con 'none' el panel se bloqueaba a sí mismo.
  if (
    req.method === "GET" &&
    (/^\/api\/projects\/[0-9a-f-]{36}\/(preview(\/|$)|assets\/)/.test(pathname) ||
      pathname === "/wc-editor.js")
  ) {
    return sellar(NextResponse.next(), CABECERAS_SEGURIDAD_INCRUSTABLE);
  }
  const secret = process.env.SESSION_SECRET;
  const cookie = req.cookies.get(SESSION_COOKIE)?.value;
  const sesion = secret && cookie ? await verificarSesion(secret, cookie, Date.now()) : null;
  if (sesion) return sellar(NextResponse.next());

  if (pathname.startsWith("/api/")) {
    return sellar(NextResponse.json({ error: "No autorizado" }, { status: 401 }));
  }
  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.search = "";
  return sellar(NextResponse.redirect(url, 307));
}

export const config = {
  matcher: ["/((?!_next/|favicon\\.ico).*)"],
};
