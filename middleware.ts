import { NextResponse, type NextRequest } from "next/server";
import { parseHost, esAliasDePlataforma } from "@/src/publish/host";
import { verificarSesion, SESSION_COOKIE } from "@/src/auth/session-cookie";
import { plataformaOculta, ROBOTS_NOINDEX, CABECERAS_SEGURIDAD, CABECERAS_SEGURIDAD_INCRUSTABLE } from "@/src/config/robots-plataforma";
import {
  PREFIJOS_PUBLICOS, CABECERA_IDIOMA, IDIOMA_POR_DEFECTO, PARAM_IDIOMA,
  cookieIdioma, esIdioma, type Idioma,
} from "@/src/i18n/idiomas";
import {
  RUTAS_PUBLICAS, ARCHIVOS_PUBLICOS, RUTAS_PRIVADAS, RUTA_NO_ENCONTRADA, bajoAlgunPrefijo,
} from "@/src/config/rutas-plataforma";

// Las listas viven en src/config/rutas-plataforma.ts, con sus porqués, para que
// un test pueda compararlas contra las páginas que existen de verdad en `app/`.

// La landing en los otros idiomas: /en, /pt, /fr, /it. Sale de la MISMA lista que
// las rutas (ver src/i18n/idiomas.ts) para que no puedan discrepar: un idioma que
// se añadiera allí y no aquí acabaría en el 307 a /login, o sea que esa landing
// no existiría para nadie.
//
// Por coincidencia EXACTA, como los archivos y no como RUTAS_PUBLICAS: abrir
// "/en/" entero dejaría sin candado cualquier página que algún día colgara de
// ahí. El idioma va en la URL solo en la landing, que es la única que necesita
// una dirección propia por idioma para que Google indexe las cinco; el resto del
// panel lo saca de la cuenta.
const RUTAS_IDIOMA = new Set(PREFIJOS_PUBLICOS);

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

  // Otros dominios nuestros (estrenala.es) → 301 al principal, conservando la
  // ruta y la query. TAMBIÉN antes de parseHost: si no, se tomarían por el
  // dominio propio de un cliente y acabarían en la 404 pública.
  if (esAliasDePlataforma(host, process.env.PLATFORM_ALIAS_HOSTS)) {
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
  // Se mira la cabecera del proxy y no PLATFORM_HOST a propósito: las variables
  // de entorno del middleware se congelan al construir la imagen (runtime Edge),
  // y esto tiene que ser verdad en tiempo de ejecución.
  const seguro = (req.headers.get("x-forwarded-proto") ?? req.nextUrl.protocol.replace(":", "")) === "https";

  if (pathname === "/") {
    const res = sellar(NextResponse.next());
    // Ver la landing en un idioma ES elegirlo, y así sigue puesto en el registro
    // y en el correo de bienvenida. Con sesión no: ahí «/» es el panel, no una
    // elección de idioma, y le pisaría al usuario la que ya tomó.
    if (!req.cookies.get(SESSION_COOKIE)) {
      res.headers.append("set-cookie", cookieIdioma(IDIOMA_POR_DEFECTO, seguro));
    }
    return res;
  }
  if (RUTAS_IDIOMA.has(pathname)) {
    // El layout no sabe en qué ruta está; aquí sí se sabe. Se le pasa el idioma
    // por cabecera de petición para que `<html lang>` no mienta.
    const idioma = pathname.slice(1) as Idioma;
    const cabeceras = new Headers(req.headers);
    cabeceras.set(CABECERA_IDIOMA, idioma);
    const res = sellar(NextResponse.next({ request: { headers: cabeceras } }));
    res.headers.append("set-cookie", cookieIdioma(idioma, seguro));
    return res;
  }
  if (ARCHIVOS_PUBLICOS.has(pathname)) return sellar(NextResponse.next());
  if (bajoAlgunPrefijo(pathname, RUTAS_PUBLICAS)) {
    // Aquí caen los enlaces de los correos (/verificar, /restablecer,
    // /invitacion, /cambiar-email), que traen su idioma en la URL porque un
    // correo se abre donde le da la gana y allí no hay ninguna cookie nuestra.
    const deUrl = req.nextUrl.searchParams.get(PARAM_IDIOMA);
    if (!esIdioma(deUrl)) return sellar(NextResponse.next());
    const cabeceras = new Headers(req.headers);
    cabeceras.set(CABECERA_IDIOMA, deUrl);
    const res = sellar(NextResponse.next({ request: { headers: cabeceras } }));
    // Y se recuerda, para que lo que venga después del enlace siga igual.
    res.headers.append("set-cookie", cookieIdioma(deUrl, seguro));
    return res;
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
  // Una dirección que no es de nadie no es una puerta cerrada: es una dirección
  // que no lleva a ninguna parte. Mandarla al login hacía que una letra de más
  // en la URL —o un enlace mal copiado— pareciera que la web entera es privada.
  //
  // Va ANTES de mirar la sesión para que la respuesta sea la misma con cuenta y
  // sin ella: una dirección inventada no existe más por haber entrado.
  //
  // Sigue sin abrirse nada. Se reescribe a una página nuestra que solo sabe
  // decir «esto no existe», así que da igual si la ruta pedida existía. Y si
  // algún día se añade una página con candado y se olvida en RUTAS_PRIVADAS,
  // cae por aquí: tampoco se sirve. Las dos ramas niegan; esto solo elige qué
  // negativa se devuelve.
  if (!bajoAlgunPrefijo(pathname, RUTAS_PRIVADAS)) {
    const destino = req.nextUrl.clone();
    destino.pathname = RUTA_NO_ENCONTRADA;
    destino.search = "";
    // El 404 lo pone la reescritura: la página de destino no puede, y un 200
    // diciendo «no existe» es justo lo que hace que Google indexe direcciones
    // que no llevan a ninguna parte.
    return sellar(NextResponse.rewrite(destino, { status: 404 }));
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

// `favicon.ico` NO se excluye, aunque sea lo que trae de serie cualquier Next.
//
// En una aplicación normal esa exclusión no molesta: hay un solo sitio y su
// icono lo sirve el propio `app/`. Aquí cada web publicada es un sitio distinto,
// y su icono está en SU almacenamiento. Excluyéndolo, `/favicon.ico` no pasaba
// por aquí, nadie lo reescribía a `/sites/<host>/…` y caía en la plataforma, que
// no tiene ninguno: TODAS las webs de clientes se quedaban sin icono de pestaña
// aunque lo trajeran en su ZIP. Se vio con la web de Quantiva el 2026-08-05,
// pidiéndola desde fuera; desde dentro no se nota, porque el navegador enseña el
// icono en blanco sin quejarse y `resolve-site.ts` ni se entera de la petición.
//
// El coste de quitarlo es una vuelta por el middleware en cada visita. A cambio,
// las webs de los clientes tienen su icono.
export const config = {
  matcher: ["/((?!_next/).*)"],
};
